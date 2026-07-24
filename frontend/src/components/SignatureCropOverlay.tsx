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

export const SignatureCropOverlay: React.FC<SignatureCropOverlayProps> = ({
  imageSrc,
  initialRoi = { x: 0.45, y: 0.52, w: 0.55, h: 0.30 },
  onApplyCrop,
  onClose,
  isLoading = false
}) => {
  const [roi, setRoi] = useState<ROI>(initialRoi);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBoxPos, setInitialBoxPos] = useState<ROI>(initialRoi);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const zoomImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setRoi(initialRoi);
  }, [initialRoi]);

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

    if (target.getAttribute('data-box') === 'true') {
      setIsDraggingBox(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setInitialBoxPos({ ...roi });
      return;
    }

    // Draw new bounding box
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
    const defaultRoi = { x: 0.45, y: 0.52, w: 0.55, h: 0.30 };
    setRoi(defaultRoi);
  };

  return (
    <div className="flex flex-col space-y-3 w-full">
      {/* Control Header */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2 rounded-lg text-xs border border-slate-800">
        <div className="flex items-center gap-2 font-bold text-blue-400">
          <Crop className="h-4 w-4" />
          <span>Interactive Crop Mapper</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetDefault}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition-all flex items-center gap-1"
            title="Reset default signature area"
          >
            <RotateCcw className="h-3 w-3" /> Auto ROI
          </button>
          <button
            onClick={() => setIsZoomModalOpen(true)}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-all flex items-center gap-1"
            title="Expand to big view for precise mapping"
          >
            <ZoomIn className="h-3 w-3" /> Expand View
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded transition-colors"
              title="Close crop mapper"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Workspace Container */}
      <div className="relative w-full flex justify-center items-center bg-slate-950 rounded-xl p-2 border border-slate-800 shadow-inner overflow-hidden select-none min-h-[200px]">
        <div
          onMouseDown={(e) => handleMouseDown(e, false)}
          onMouseMove={(e) => handleMouseMove(e, false)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative inline-block cursor-crosshair"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Scanned Cheque"
            className="max-h-[220px] w-auto max-w-full object-contain pointer-events-none block rounded opacity-95"
          />

          {/* Precision Crop Overlay Box */}
          <div
            data-box="true"
            className="absolute border-2 border-blue-500 bg-blue-500/15 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
            style={{
              left: `${roi.x * 100}%`,
              top: `${roi.y * 100}%`,
              width: `${roi.w * 100}%`,
              height: `${roi.h * 100}%`
            }}
          >
            {/* Box Header Badge */}
            <div className="absolute -top-5 left-0 bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.2 rounded shadow pointer-events-none whitespace-nowrap">
              Mapped Crop Region
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
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg shadow-md flex items-center justify-center gap-1.5"
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
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 text-xs py-2 px-3 font-semibold"
          >
            Done
          </Button>
        )}
      </div>

      {/* Expand / Big View Modal for Precise Mapping */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Maximize2 className="h-4 w-4 text-blue-400" />
                <span>Expanded Full Cheque Signature Mapper</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefault}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Auto ROI
                </button>
                <button
                  onClick={() => setIsZoomModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Large Canvas Workspace */}
            <div className="flex-1 overflow-auto p-6 bg-slate-950 flex items-center justify-center select-none">
              <div
                onMouseDown={(e) => handleMouseDown(e, true)}
                onMouseMove={(e) => handleMouseMove(e, true)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative inline-block cursor-crosshair border-2 border-slate-800 rounded-lg shadow-xl"
              >
                <img
                  ref={zoomImgRef}
                  src={imageSrc}
                  alt="Expanded Scanned Cheque"
                  className="max-h-[65vh] w-auto object-contain pointer-events-none block rounded opacity-95"
                />

                {/* Crop Box Overlay in Large View */}
                <div
                  data-box="true"
                  className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.70)]"
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

            {/* Modal Footer Bar */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Click & drag over the cheque image to select a custom signature area for verification.
              </span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsZoomModalOpen(false)}
                  className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onApplyCrop(roi);
                    setIsZoomModalOpen(false);
                  }}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-md flex items-center gap-2"
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
