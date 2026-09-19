import React, { useState, useRef, useEffect } from 'react';
import { Crop, RefreshCw, Check, Move, Maximize2, RotateCcw, X, ZoomIn } from 'lucide-react';
import { Button } from './ui/button';

export interface ROI {
  x: number; // 0 to 1
  y: number; // 0 to 1
  w: number; // 0 to 1
  h: number; // 0 to 1
}

interface SignatureCropOverlayProps {
  imageSrc: string;
  initialRoi?: ROI;
  onApplyCrop: (roi: ROI) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

const DEFAULT_ROI: ROI = { x: 0.58, y: 0.52, w: 0.40, h: 0.30 };

export const SignatureCropOverlay: React.FC<SignatureCropOverlayProps> = ({
  imageSrc,
  initialRoi,
  onApplyCrop,
  onClose,
  isLoading = false
}) => {
  const [roi, setRoi] = useState<ROI>(() => initialRoi || DEFAULT_ROI);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBoxPos, setInitialBoxPos] = useState<ROI>(() => initialRoi || DEFAULT_ROI);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const zoomImgRef = useRef<HTMLImageElement>(null);

  // Calculate mouse position strictly relative to the displayed image element pixels
  const getRelativeImageCoords = (e: React.MouseEvent<HTMLDivElement>, targetImgRef: React.RefObject<HTMLImageElement>) => {
    if (!targetImgRef.current) return { x: 0, y: 0 };
    const rect = targetImgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, isZoom = false) => {
    const currentImgRef = isZoom ? zoomImgRef : imgRef;
    if (!currentImgRef.current) return;
    const coords = getRelativeImageCoords(e, currentImgRef);

    const target = e.target as HTMLElement;
    const handleType = target.getAttribute('data-handle');

    if (handleType) {
      setActiveHandle(handleType);
      setStartPos({ x: e.clientX, y: e.clientY });
      setInitialBoxPos({ ...roi });
      return;
    }

    // Check if user clicked strictly inside the existing crop box area
    const isInsideBox = (
      coords.x >= roi.x &&
      coords.x <= roi.x + roi.w &&
      coords.y >= roi.y &&
      coords.y <= roi.y + roi.h
    );

    if (isInsideBox && target.getAttribute('data-box') === 'true') {
      setIsDraggingBox(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setInitialBoxPos({ ...roi });
      return;
    }

    // Draw new bounding box if clicked outside or anywhere on image canvas
    setIsDrawing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setRoi({
      x: coords.x,
      y: coords.y,
      w: 0.04,
      h: 0.04
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, isZoom = false) => {
    const currentImgRef = isZoom ? zoomImgRef : imgRef;
    if (!currentImgRef.current) return;
    const imgRect = currentImgRef.current.getBoundingClientRect();

    if (isDrawing) {
      const coords = getRelativeImageCoords(e, currentImgRef);
      const startCoordsX = Math.max(0, Math.min(1, (startPos.x - imgRect.left) / imgRect.width));
      const startCoordsY = Math.max(0, Math.min(1, (startPos.y - imgRect.top) / imgRect.height));

      const newX = Math.min(startCoordsX, coords.x);
      const newY = Math.min(startCoordsY, coords.y);
      const newW = Math.max(0.04, Math.min(1 - newX, Math.abs(coords.x - startCoordsX)));
      const newH = Math.max(0.04, Math.min(1 - newY, Math.abs(coords.y - startCoordsY)));

      setRoi({ x: newX, y: newY, w: newW, h: newH });
      return;
    }

    if (isDraggingBox) {
      const deltaX = (e.clientX - startPos.x) / imgRect.width;
      const deltaY = (e.clientY - startPos.y) / imgRect.height;

      const newX = Math.max(0, Math.min(1 - initialBoxPos.w, initialBoxPos.x + deltaX));
      const newY = Math.max(0, Math.min(1 - initialBoxPos.h, initialBoxPos.y + deltaY));

      setRoi({ ...initialBoxPos, x: newX, y: newY });
      return;
    }

    if (activeHandle) {
      const deltaX = (e.clientX - startPos.x) / imgRect.width;
      const deltaY = (e.clientY - startPos.y) / imgRect.height;

      let { x, y, w, h } = initialBoxPos;

      if (activeHandle.includes('e')) {
        w = Math.max(0.04, Math.min(1 - x, initialBoxPos.w + deltaX));
      }
      if (activeHandle.includes('s')) {
        h = Math.max(0.04, Math.min(1 - y, initialBoxPos.h + deltaY));
      }
      if (activeHandle.includes('w')) {
        const potentialW = initialBoxPos.w - deltaX;
        if (potentialW >= 0.04 && initialBoxPos.x + deltaX >= 0) {
          x = initialBoxPos.x + deltaX;
          w = potentialW;
        }
      }
      if (activeHandle.includes('n')) {
        const potentialH = initialBoxPos.h - deltaY;
        if (potentialH >= 0.04 && initialBoxPos.y + deltaY >= 0) {
          y = initialBoxPos.y + deltaY;
          h = potentialH;
        }
      }

      setRoi({ x, y, w, h });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsDraggingBox(false);
    setActiveHandle(null);
  };

  const handleResetDefault = () => {
    setRoi(DEFAULT_ROI);
  };

  return (
    <div className="flex flex-col space-y-3 w-full bg-white rounded-xl">
      {/* Control Header - Clean Light Theme */}
      <div className="flex items-center justify-between bg-slate-100/90 text-slate-800 px-3 py-2 rounded-lg text-xs border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-blue-700">
          <Crop className="h-4 w-4 text-blue-600" />
          <span>Interactive Signature Crop</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetDefault}
            className="px-2 py-1 bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Reset default signature area"
          >
            <RotateCcw className="h-3 w-3 text-slate-500" /> Auto ROI
          </button>
          <button
            onClick={() => setIsZoomModalOpen(true)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Expand to big view for precise mapping"
          >
            <ZoomIn className="h-3 w-3" /> Expand View
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 bg-slate-200/80 hover:bg-red-600 text-slate-600 hover:text-white rounded transition-colors cursor-pointer"
              title="Close crop mapper"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Workspace Container - Clean Light Theme */}
      <div className="relative w-full flex justify-center items-center bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 shadow-inner overflow-hidden select-none min-h-[200px]">
        <div
          onMouseDown={(e) => handleMouseDown(e, false)}
          onMouseMove={(e) => handleMouseMove(e, false)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative inline-block cursor-crosshair shadow-sm rounded overflow-hidden"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Scanned Cheque"
            className="max-h-[220px] w-auto max-w-full object-contain pointer-events-none block rounded"
          />

          {/* Precision Crop Overlay Box */}
          <div
            data-box="true"
            className="absolute border-2 border-blue-600 bg-blue-600/20 cursor-move shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
            style={{
              left: `${roi.x * 100}%`,
              top: `${roi.y * 100}%`,
              width: `${roi.w * 100}%`,
              height: `${roi.h * 100}%`
            }}
          >
            {/* Box Header Badge */}
            <div className="absolute -top-5 left-0 bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
              Mapped Region
            </div>

            {/* Resize Handles */}
            <div data-handle="nw" className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow" />
            <div data-handle="ne" className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow" />
            <div data-handle="sw" className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow" />
            <div data-handle="se" className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow" />
            <div data-handle="n" className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize shadow" />
            <div data-handle="s" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize shadow" />
            <div data-handle="w" className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize shadow" />
            <div data-handle="e" className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize shadow" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onApplyCrop(roi)}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Fetching Comparisons...</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Apply Mapped Crop</span>
            </>
          )}
        </Button>

        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs py-2 px-3 font-semibold rounded-lg cursor-pointer"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Expand / Big View Modal for Precise Mapping - Modern Light Theme */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Maximize2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Expanded Full Cheque Signature Mapper</h3>
                  <p className="text-[11px] text-slate-500 font-normal">Draw or adjust the bounding box over the signature area</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefault}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Reset Auto ROI
                </button>
                <button
                  onClick={() => setIsZoomModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Large Canvas Workspace - Clean Light Theme */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100/90 flex items-center justify-center select-none">
              <div
                onMouseDown={(e) => handleMouseDown(e, true)}
                onMouseMove={(e) => handleMouseMove(e, true)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative inline-block cursor-crosshair border-2 border-slate-300 rounded-lg shadow-lg bg-white overflow-hidden"
              >
                <img
                  ref={zoomImgRef}
                  src={imageSrc}
                  alt="Expanded Scanned Cheque"
                  className="max-h-[62vh] w-auto object-contain pointer-events-none block rounded"
                />

                {/* Crop Box Overlay in Large View */}
                <div
                  data-box="true"
                  className="absolute border-2 border-blue-600 bg-blue-600/20 cursor-move shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                  style={{
                    left: `${roi.x * 100}%`,
                    top: `${roi.y * 100}%`,
                    width: `${roi.w * 100}%`,
                    height: `${roi.h * 100}%`
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5 rounded shadow pointer-events-none">
                    Mapped Signature Selection
                  </div>

                  <div data-handle="nw" className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow" />
                  <div data-handle="ne" className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow" />
                  <div data-handle="sw" className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow" />
                  <div data-handle="se" className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow" />
                  <div data-handle="n" className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize shadow" />
                  <div data-handle="s" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize shadow" />
                  <div data-handle="w" className="absolute top-1/2 -translate-y-1/2 -left-2 w-2.5 h-5 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize shadow" />
                  <div data-handle="e" className="absolute top-1/2 -translate-y-1/2 -right-2 w-2.5 h-5 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize shadow" />
                </div>
              </div>
            </div>

            {/* Modal Footer Bar - Clean Light Theme */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Click & drag over the cheque image to select a custom signature area for verification.
              </span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsZoomModalOpen(false)}
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onApplyCrop(roi);
                    setIsZoomModalOpen(false);
                  }}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Apply Crop & Recalculate Matches</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

