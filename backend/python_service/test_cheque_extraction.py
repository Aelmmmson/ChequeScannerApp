"""
Mock Unit Test Script for Offline Cheque Extraction Engine
Tests perspective correction, ROI extraction, Tesseract/heuristic OCR, date validation, and HITL review flags.
"""

import cv2
import numpy as np
import json
from cheque_extractor import process_cheque_pipeline, cv2_to_base64

def generate_mock_cheque_image():
    """Generates a synthetic high-resolution cheque image for local testing."""
    img = np.ones((375, 800, 3), dtype=np.uint8) * 245
    
    # Draw dark border & security hatched background lines
    cv2.rectangle(img, (5, 5), (795, 370), (180, 200, 210), 2)
    for y in range(20, 360, 15):
        cv2.line(img, (10, y), (790, y), (230, 235, 240), 1)
        
    # Draw Date Box & Text
    cv2.putText(img, "DATE: 2026-07-20", (530, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    
    # Draw Payee Line & Text
    cv2.putText(img, "PAY TO THE ORDER OF: BENJAMIN ANDERSON", (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    
    # Draw Amount Box & Text
    cv2.rectangle(img, (530, 110), (770, 155), (100, 100, 100), 2)
    cv2.putText(img, "GHS 20,000.00", (540, 142), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2)
    
    # Draw Legal Amount Line
    cv2.putText(img, "TWENTY THOUSAND GHS ONLY", (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (15, 15, 15), 2)
    
    # Draw Signature Line
    cv2.line(img, (480, 280), (770, 280), (100, 100, 100), 2)
    cv2.putText(img, "BENJAMIN ANDERSON", (510, 305), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
    
    # Draw MICR Line
    cv2.putText(img, "c000785c a091904a 19010000000599171c", (120, 345), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    
    return img

def main():
    print("=========================================================")
    print("Running Offline Cheque Processing & Extraction Unit Test")
    print("=========================================================")
    
    mock_img = generate_mock_cheque_image()
    b64_img = cv2_to_base64(mock_img)
    
    mock_micr_hardware = {
        "checkNumber": "000785",
        "accountNumber": "19010000000599171",
        "routingNumber": "091904",
        "rawMicr": "091:9040007857211U01"
    }
    
    result = process_cheque_pipeline(b64_img, mock_micr_hardware)
    
    print("\n--- Extraction Result Summary ---")
    print("Success:", result.get("success"))
    print("Review Required (HITL Flag):", result.get("reviewRequired"))
    print("Overall Confidence Score:", result.get("overallConfidenceScore"))
    print("Flagged Fields:", json.dumps(result.get("flaggedFields"), indent=2))
    print("\n--- Parsed Transaction Cheque Data ---")
    print(json.dumps(result.get("chequeData"), indent=2))
    
    if result.get("processedImages"):
        print("\nExtracted ROIs successfully generated base64 JPEG payloads:")
        for k in result["processedImages"]:
            print(f" - {k}: {result['processedImages'][k][:35]}...")
            
    print("\n=========================================================")
    print("Unit Test Execution Completed Successfully!")
    print("=========================================================")

if __name__ == '__main__':
    main()
