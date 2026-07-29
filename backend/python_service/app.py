import base64
import io
import re
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Private-Network', 'true')
    return response

def base64_to_cv2(b64_string):
    if not b64_string:
        return None
    if ',' in b64_string:
        b64_string = b64_string.split(',')[1]
    try:
        img_bytes = base64.b64decode(b64_string)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print("base64_to_cv2 error:", str(e))
        return None

def cv2_to_base64(img):
    if img is None or img.size == 0:
        return ""
    _, buffer = cv2.imencode('.jpg', img)
    b64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"

def preprocess_signature(img):
    if img is None or img.size == 0:
        return None, 1.0, 0
    
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
    
    # 1. Bilateral filter to smooth background security patterns while preserving pen stroke edges
    filtered = cv2.bilateralFilter(gray, 7, 50, 50)
    blur = cv2.GaussianBlur(filtered, (3, 3), 0)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Remove thin background hatch lines & printed horizontal baselines
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 1))
    lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horiz_kernel)
    thresh_no_lines = cv2.subtract(thresh, lines)
    
    # 2. Connected Component Analysis to isolate cursive pen strokes
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh_no_lines)
    sig_mask = np.zeros_like(thresh_no_lines)
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        
        # Keep cursive stroke components (area >= 15, height >= 6) and filter out tiny dots
        if area >= 15 and h >= 6 and w < (thresh_no_lines.shape[1] * 0.85):
            sig_mask[labels == i] = 255
            
    coords = cv2.findNonZero(sig_mask)
    if coords is None:
        return sig_mask, 1.0, 0
    
    x, y, w, h = cv2.boundingRect(coords)
    pad = 4
    x = max(0, x - pad)
    y = max(0, y - pad)
    w = min(gray.shape[1] - x, w + 2*pad)
    h = min(gray.shape[0] - y, h + 2*pad)
    
    cropped = sig_mask[y:y+h, x:x+w]
    aspect_ratio = float(w) / float(h) if h > 0 else 1.0
    stroke_pixel_count = np.count_nonzero(cropped)
    
    return cropped, aspect_ratio, stroke_pixel_count

def skeletonize_mask(mask):
    """Perform skeletonization using cv2.ximgproc.thinning or morphological erosion fallback."""
    if mask is None or mask.size == 0 or np.count_nonzero(mask) == 0:
        return np.zeros_like(mask) if mask is not None else np.zeros((10, 10), dtype=np.uint8)
    try:
        if hasattr(cv2, 'ximgproc') and hasattr(cv2.ximgproc, 'thinning'):
            return cv2.ximgproc.thinning(mask, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
    except Exception:
        pass
    
    skel = np.zeros(mask.shape, np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    temp_mask = mask.copy()
    for _ in range(100):
        eroded = cv2.erode(temp_mask, element)
        temp = cv2.dilate(eroded, element)
        temp = cv2.subtract(temp_mask, temp)
        skel = cv2.bitwise_or(skel, temp)
        temp_mask = eroded.copy()
        if cv2.countNonZero(temp_mask) == 0:
            break
    return skel

def analyze_stroke_trajectory(img1_mask, img2_mask):
    """1. Vector Geometry & Stroke Trajectory Analysis using HoughLinesP."""
    try:
        if img1_mask is None or img2_mask is None or img1_mask.size == 0 or img2_mask.size == 0:
            return 0.5
            
        skel1 = skeletonize_mask(img1_mask)
        skel2 = skeletonize_mask(img2_mask)
        
        lines1 = cv2.HoughLinesP(skel1, 1, np.pi / 180, threshold=10, minLineLength=5, maxLineGap=3)
        lines2 = cv2.HoughLinesP(skel2, 1, np.pi / 180, threshold=10, minLineLength=5, maxLineGap=3)
        
        n1 = len(lines1) if lines1 is not None else 0
        n2 = len(lines2) if lines2 is not None else 0
        
        if n1 == 0 and n2 == 0:
            return 1.0
        if n1 == 0 or n2 == 0:
            return 0.2
            
        max_n = max(n1, n2)
        min_n = min(n1, n2)
        count_diff_ratio = (max_n - min_n) / float(max_n)
        
        count_penalty = 1.0
        if count_diff_ratio > 0.30:
            count_penalty = max(0.1, 1.0 - (count_diff_ratio - 0.30) * 2.0)
            
        def extract_orientations(lines):
            angles = []
            for line in lines:
                pt = np.array(line).reshape(-1)
                if len(pt) >= 4:
                    x1, y1, x2, y2 = pt[0], pt[1], pt[2], pt[3]
                    angle = np.arctan2(y2 - y1, x2 - x1) % np.pi
                    angles.append(angle)
            return np.array(angles) if len(angles) > 0 else np.array([0.0])
            
        angles1 = extract_orientations(lines1)
        angles2 = extract_orientations(lines2)
        
        hist1, _ = np.histogram(angles1, bins=8, range=(0, np.pi), density=True)
        hist2, _ = np.histogram(angles2, bins=8, range=(0, np.pi), density=True)
        
        hist_sim = np.sum(np.minimum(hist1, hist2)) / max(1e-5, np.sum(np.maximum(hist1, hist2)))
        trajectory_score = float(hist_sim * count_penalty)
        return min(1.0, max(0.0, trajectory_score))
    except Exception as e:
        print("analyze_stroke_trajectory error:", str(e))
        return 0.5

def analyze_aspect_ratio_distortion(aspect1, aspect2, img1_mask, img2_mask):
    """2. Compression & Stroke Density Analysis."""
    try:
        ar_sim = min(aspect1, aspect2) / max(aspect1, aspect2) if max(aspect1, aspect2) > 0 else 1.0
        
        area1 = max(1, img1_mask.shape[0] * img1_mask.shape[1]) if img1_mask is not None else 1
        area2 = max(1, img2_mask.shape[0] * img2_mask.shape[1]) if img2_mask is not None else 1
        
        stroke_pixels1 = np.count_nonzero(img1_mask) if img1_mask is not None else 0
        stroke_pixels2 = np.count_nonzero(img2_mask) if img2_mask is not None else 0
        
        density1 = stroke_pixels1 / float(area1)
        density2 = stroke_pixels2 / float(area2)
        
        max_density = max(density1, density2, 1e-6)
        density_diff = abs(density1 - density2) / max_density
        
        if density_diff > 0.40:
            density_penalty = max(0.1, 1.0 - (density_diff - 0.40) * 2.5)
        else:
            density_penalty = 1.0 - (density_diff * 0.5)
            
        compression_penalty = float(ar_sim * density_penalty)
        return min(1.0, max(0.0, compression_penalty))
    except Exception as e:
        print("analyze_aspect_ratio_distortion error:", str(e))
        return 0.5

def analyze_spatial_anchoring(img1_mask, img2_mask):
    """3. Baseline Slant & Centroid Tilt Analysis."""
    try:
        if img1_mask is None or img2_mask is None or img1_mask.size == 0 or img2_mask.size == 0:
            return 0.5
            
        def get_rect_angle(mask):
            coords = cv2.findNonZero(mask)
            if coords is None or len(coords) < 5:
                return 0.0
            rect = cv2.minAreaRect(coords)
            angle = rect[2]
            if angle < -45:
                angle += 90
            elif angle > 45:
                angle -= 90
            return angle
            
        angle1 = get_rect_angle(img1_mask)
        angle2 = get_rect_angle(img2_mask)
        delta_angle = abs(angle1 - angle2)
        
        if delta_angle > 5.0:
            return 0.0
            
        def get_centroid_tilt(mask):
            h = mask.shape[0]
            half = max(1, h // 2)
            upper = mask[0:half, :]
            lower = mask[half:, :]
            m_upper = cv2.moments(upper)
            m_lower = cv2.moments(lower)
            cx_upper = (m_upper['m10'] / m_upper['m00']) if m_upper['m00'] > 0 else 0
            cx_lower = (m_lower['m10'] / m_lower['m00']) if m_lower['m00'] > 0 else 0
            return cx_upper - cx_lower
            
        tilt1 = get_centroid_tilt(img1_mask)
        tilt2 = get_centroid_tilt(img2_mask)
        tilt_diff = abs(tilt1 - tilt2) / max(1.0, abs(tilt1) + abs(tilt2))
        
        angle_factor = 1.0 - (delta_angle / 5.0)
        tilt_factor = max(0.2, 1.0 - tilt_diff)
        
        anchoring_score = float(angle_factor * tilt_factor)
        return min(1.0, max(0.0, anchoring_score))
    except Exception as e:
        print("analyze_spatial_anchoring error:", str(e))
        return 0.5

def analyze_edge_integrity(img1_mask, img2_mask):
    """4. Background Noise & Edge Integrity Analysis."""
    try:
        if img1_mask is None or img2_mask is None or img1_mask.size == 0 or img2_mask.size == 0:
            return 0.5
            
        def get_perimeter_area_ratio(mask):
            canny = cv2.Canny(mask, 50, 150)
            contours, _ = cv2.findContours(canny, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
            total_perimeter = sum(cv2.arcLength(cnt, True) for cnt in contours)
            area = max(1, np.count_nonzero(mask))
            return total_perimeter / float(area)
            
        r1 = get_perimeter_area_ratio(img1_mask)
        r2 = get_perimeter_area_ratio(img2_mask)
        
        max_r = max(r1, r2, 1e-6)
        noise_diff = abs(r1 - r2) / max_r
        
        if noise_diff >= 0.20:
            edge_confidence = max(0.0, 1.0 - noise_diff)
        else:
            edge_confidence = 1.0 - (noise_diff * 0.5)
            
        return min(1.0, max(0.0, float(edge_confidence)))
    except Exception as e:
        print("analyze_edge_integrity error:", str(e))
        return 0.5

def compare_two_signatures(img1, img2):
    proc1, aspect1, count1 = preprocess_signature(img1)
    proc2, aspect2, count2 = preprocess_signature(img2)
    
    empty_details = {
        "trajectory_score": 0.0,
        "compression_penalty": 0.0,
        "anchoring_score": 0.0,
        "edge_confidence": 0.0,
        "weighted_geometric_mean": 0.0,
        "baseline_calibrated_similarity": 0.0,
        "final_combined_score": 0.0
    }
    
    if proc1 is None or proc2 is None or count1 < 25 or count2 < 25:
        return 0.0, "INVALID", empty_details
        
    ar_similarity = min(aspect1, aspect2) / max(aspect1, aspect2)
    
    target_w, target_h = 200, 100
    r1 = cv2.resize(proc1, (target_w, target_h), interpolation=cv2.INTER_AREA)
    r2 = cv2.resize(proc2, (target_w, target_h), interpolation=cv2.INTER_AREA)
    
    cnt1_res = np.count_nonzero(r1)
    cnt2_res = np.count_nonzero(r2)
    
    intersection = np.logical_and(r1 > 0, r2 > 0).sum()
    union = np.logical_or(r1 > 0, r2 > 0).sum()
    iou = intersection / union if union > 0 else 0.0
    dice = (2.0 * intersection) / (cnt1_res + cnt2_res + 1e-5)
    
    r1_norm = (r1.astype(float) - r1.mean()) / (r1.std() + 1e-5)
    r2_norm = (r2.astype(float) - r2.mean()) / (r2.std() + 1e-5)
    ncc = np.mean(r1_norm * r2_norm)
    ncc_score = max(0.0, float(ncc))
    
    orb = cv2.ORB_create(nfeatures=400)
    kp1, des1 = orb.detectAndCompute(r1, None)
    kp2, des2 = orb.detectAndCompute(r2, None)
    orb_score = 0.0
    if des1 is not None and des2 is not None and len(des1) > 0 and len(des2) > 0:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        if len(matches) > 0:
            good_matches = [m for m in matches if m.distance < 42]
            max_kp = min(len(kp1), len(kp2))
            orb_score = min(1.0, len(good_matches) / max(1, max_kp))
            
    stroke_similarity = (iou * 0.35) + (dice * 0.35) + (ncc_score * 0.15) + (orb_score * 0.15)
    baseline_calibrated = stroke_similarity * (ar_similarity ** 0.8) * 1.55
    baseline_calibrated = min(0.98, max(0.0, float(baseline_calibrated)))
    
    # 4 New Biometric Signature Analysis Functions
    trajectory_score = analyze_stroke_trajectory(proc1, proc2)
    compression_penalty = analyze_aspect_ratio_distortion(aspect1, aspect2, proc1, proc2)
    anchoring_score = analyze_spatial_anchoring(proc1, proc2)
    edge_confidence = analyze_edge_integrity(proc1, proc2)
    
    # Weighted Geometric Mean
    weighted_geometric_mean = (
        (trajectory_score ** 0.30) *
        (compression_penalty ** 0.20) *
        (anchoring_score ** 0.30) *
        (edge_confidence ** 0.20)
    )
    
    final_score = weighted_geometric_mean * baseline_calibrated
    similarity_percentage = round(min(98.0, max(0.0, float(final_score) * 100.0)), 2)
    status = "VALID" if similarity_percentage >= 50.0 else "MISMATCH"
    
    debug_details = {
        "trajectory_score": round(float(trajectory_score), 4),
        "compression_penalty": round(float(compression_penalty), 4),
        "anchoring_score": round(float(anchoring_score), 4),
        "edge_confidence": round(float(edge_confidence), 4),
        "weighted_geometric_mean": round(float(weighted_geometric_mean), 4),
        "baseline_calibrated_similarity": round(float(baseline_calibrated), 4),
        "final_combined_score": round(float(final_score), 4)
    }
    
    return similarity_percentage, status, debug_details

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "ChequeScanner Pure Python Vision Engine"})

@app.route('/crop-signature', methods=['POST'])
def crop_signature():
    try:
        data = request.json or {}
        b64_image = data.get('image', '')
        default_roi = {'x': 0.45, 'y': 0.52, 'w': 0.55, 'h': 0.30}
        roi = data.get('roi') or default_roi
        
        img = base64_to_cv2(b64_image)
        if img is None:
            return jsonify({'success': False, 'croppedImage': b64_image})
            
        h, w = img.shape[:2]
        rx = int(float(roi.get('x', 0.45)) * w)
        ry = int(float(roi.get('y', 0.52)) * h)
        rw = int(float(roi.get('w', 0.55)) * w)
        rh = int(float(roi.get('h', 0.30)) * h)
        
        rx = max(0, min(w - 1, rx))
        ry = max(0, min(h - 1, ry))
        rw = max(1, min(w - rx, rw))
        rh = max(1, min(h - ry, rh))
        
        cropped = img[ry:ry+rh, rx:rx+rw]
        
        # Fine-tune auto crop around actual ink strokes ONLY for default automatic cropping (not for custom user mapped crops)
        is_custom = (
            data.get('isCustom', False) or 
            data.get('custom', False) or 
            (isinstance(roi, dict) and roi.get('isCustom', False))
        )
        if not is_custom:
            proc, _, _ = preprocess_signature(cropped)
            coords = cv2.findNonZero(proc)
            if coords is not None:
                bx, by, bw, bh = cv2.boundingRect(coords)
                pad = 12
                bx = max(0, bx - pad)
                by = max(0, by - pad)
                bw = min(cropped.shape[1] - bx, bw + 2*pad)
                bh = min(cropped.shape[0] - by, bh + 2*pad)
                cropped = cropped[by:by+bh, bx:bx+bw]
            
        b64_cropped = cv2_to_base64(cropped)
        return jsonify({
            'success': True,
            'croppedImage': b64_cropped,
            'rawCroppedImage': b64_cropped
        })
    except Exception as e:
        print("crop_signature error:", str(e))
        return jsonify({'success': False, 'croppedImage': data.get('image', '')})

@app.route('/compare-signatures', methods=['POST'])
def compare_signatures_endpoint():
    try:
        data = request.json or {}
        sig1_b64 = data.get('signature1') or data.get('sig1', '')
        sig2_b64 = data.get('signature2') or data.get('sig2', '')
        
        img1 = base64_to_cv2(sig1_b64)
        img2 = base64_to_cv2(sig2_b64)
        
        if img1 is None or img2 is None:
            return jsonify({
                'success': False,
                'similarityPercentage': 0,
                'percentage': '0%',
                'status': 'ERROR',
                'message': 'Invalid signature image payload'
            })
            
        similarity_percentage, status, debug_details = compare_two_signatures(img1, img2)
        return jsonify({
            'success': True,
            'similarityPercentage': similarity_percentage,
            'percentage': f"{similarity_percentage}%",
            'status': status,
            'debug_details': debug_details
        })
    except Exception as e:
        print("compare_signatures error:", str(e))
        return jsonify({
            'success': False,
            'similarityPercentage': 0,
            'percentage': '0%',
            'status': 'ERROR',
            'error': str(e)
        })

@app.route('/extract-cheque-data', methods=['POST'])
def extract_cheque_data_endpoint():
    try:
        from cheque_extractor import process_cheque_pipeline
        data = request.json or {}
        image_b64 = data.get('image') or data.get('frontImage') or ''
        required_signatures = int(data.get('requiredSignatures') or data.get('required_signatures') or 1)
        micr_data = data.get('micrData') or {
            'checkNumber': data.get('checkNumber'),
            'accountNumber': data.get('accountNumber'),
            'routingNumber': data.get('routingNumber'),
            'rawMicr': data.get('micr')
        }
        
        result = process_cheque_pipeline(image_b64, micr_data, required_signatures)
        return jsonify(result)
    except Exception as e:
        print("extract_cheque_data error:", str(e))
        return jsonify({
            'success': False,
            'error': str(e),
            'reviewRequired': True
        })

if __name__ == '__main__':
    print("Starting ChequeScanner Pure Python Vision Engine on port 8130...")
    app.run(host='0.0.0.0', port=8130, debug=False)
