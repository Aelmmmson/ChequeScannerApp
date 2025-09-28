// import React, { useState, useRef, forwardRef } from 'react';
// import { Camera, X, Upload } from 'lucide-react';
// import { useToast } from "@/components/ui/use-toast";

// interface FaceRecognitionProps {
//   accountNumber: string | number;
//   isOpen: boolean;
//   onClose: () => void;
//   toast: ReturnType<typeof useToast>['toast'];
// }

// interface FaceResult {
//   faceUrl: string;
//   isMatch: boolean;
//   similarity: number;
// }

// const FaceRecognition = forwardRef<HTMLDivElement, FaceRecognitionProps>(({ accountNumber, isOpen, onClose, toast }, ref) => {
//   const [capturedFace, setCapturedFace] = useState<string | null>(null);
//   const [customerFaces, setCustomerFaces] = useState<FaceResult[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // Function to get similarity color
//   const getSimilarityColor = (similarity: number) => {
//     if (similarity >= 90) return 'text-green-600';
//     if (similarity >= 70) return 'text-yellow-600';
//     if (similarity >= 50) return 'text-orange-600';
//     return 'text-red-600';
//   };

//   // Handle file upload
//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith('image/')) {
//       const reader = new FileReader();
//       reader.onload = () => {
//         setCapturedFace(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       toast({
//         title: "Invalid File",
//         description: "Please upload a valid image file (jpeg/jpg/png).",
//         variant: "destructive"
//       });
//     }
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   // Handle face comparison
//   const handleCompareFace = async () => {
//     if (!capturedFace) {
//       toast({
//         title: "No Face Uploaded",
//         description: "Please upload a face image before comparing.",
//         variant: "destructive"
//       });
//       return;
//     }

//     if (!accountNumber) {
//       toast({
//         title: "No Account Number",
//         description: "Account number is required for face comparison.",
//         variant: "destructive"
//       });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const blob = await fetch(capturedFace).then(res => res.blob());
//       const formData = new FormData();
//       formData.append('livePhoto', blob, 'livePhoto.jpg');
//       formData.append('accountNumber', String(accountNumber));

//       const response = await fetch('http://localhost:7007/compare-faces', {
//         method: 'POST',
//         body: formData
//       });

//       const result = await response.json();
//       if (!response.ok) {
//         throw new Error(result.error || 'Failed to compare faces');
//       }

//       // Convert face URLs to base64 for display
//       const faceImages = await Promise.all(
//         result.faces.map(async (face: FaceResult) => {
//           try {
//             const imgResponse = await fetch(face.faceUrl);
//             const blob = await imgResponse.blob();
//             return new Promise<string>((resolve) => {
//               const reader = new FileReader();
//               reader.onloadend = () => resolve(reader.result as string);
//               reader.readAsDataURL(blob);
//             });
//           } catch (error: unknown) {
//             console.error('Error fetching face image:', face.faceUrl, error);
//             return face.faceUrl; // Fallback to URL if fetch fails
//           }
//         })
//       );

//       setCustomerFaces(result.faces.map((face: FaceResult, index: number) => ({
//         faceUrl: faceImages[index],
//         isMatch: face.isMatch,
//         similarity: parseFloat(face.similarity) * 100
//       })));

//       toast({
//         title: result.isMatch ? "Face Match Found" : "No Face Match",
//         description: `Best similarity: ${(result.bestSimilarity * 100).toFixed(2)}%`,
//         variant: result.isMatch ? "default" : "destructive"
//       });
//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       toast({
//         title: "Comparison Error",
//         description: errorMessage || "Failed to compare faces.",
//         variant: "destructive"
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <aside
//       ref={ref}
//       className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
//     >
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-bold text-gray-700">ScanFace Recognition</h2>
//         <button
//           onClick={onClose}
//           className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
//           title="Close"
//         >
//           <X className="h-5 w-5" />
//         </button>
//       </div>
//       <div className="space-y-6">
//         <div className="border border-dashed border-gray-300 rounded-lg p-4">
//           <h3 className="text-lg font-semibold text-gray-700 mb-3">Upload Face Image</h3>
//           <div className="relative h-64 bg-gray-100 rounded-md flex items-center justify-center mb-4">
//             {isLoading ? (
//               <div className="flex items-center justify-center h-full">
//                 <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg>
//                 <span className="ml-2 text-sm text-gray-600">Processing...</span>
//               </div>
//             ) : capturedFace ? (
//               <img
//                 src={capturedFace}
//                 alt="Uploaded face"
//                 className="max-h-full max-w-full object-contain"
//               />
//             ) : (
//               <div className="text-gray-400 text-center">
//                 <Camera className="h-12 w-12 mx-auto mb-2" />
//                 <p>No face uploaded</p>
//               </div>
//             )}
//           </div>
//           <input
//             ref={fileInputRef}
//             type="file"
//             accept="image/jpeg,image/jpg,image/png"
//             className="hidden"
//             onChange={handleFileUpload}
//           />
//           <button
//             onClick={() => fileInputRef.current?.click()}
//             disabled={isLoading}
//             className={`w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//           >
//             <Upload className="h-4 w-4" />
//             Upload Photo
//           </button>
//         </div>
//         {customerFaces.length > 0 && (
//           <div className="border border-dashed border-gray-300 rounded-lg p-4">
//             <h3 className="text-lg font-semibold text-gray-700 mb-3">Customer Faces</h3>
//             <div className="h-64 overflow-y-auto">
//               {customerFaces.length === 1 ? (
//                 <div className="relative h-full flex items-center justify-center">
//                   <img
//                     src={customerFaces[0].faceUrl}
//                     alt="Customer face"
//                     className="max-h-full max-w-full object-contain transition-transform duration-200 hover:scale-110"
//                     title={`Similarity: ${customerFaces[0].similarity.toFixed(2)}%`}
//                   />
//                   <div className="absolute top-2 right-2">
//                     {customerFaces[0].isMatch ? (
//                       <svg className="h-6 w-6 text-green-500 bg-white bg-opacity-75 rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
//                       </svg>
//                     ) : (
//                       <svg className="h-6 w-6 text-red-500 bg-white bg-opacity-75 rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
//                       </svg>
//                     )}
//                   </div>
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-2 gap-2">
//                   {customerFaces.map((face, index) => (
//                     <div key={index} className="relative h-32 bg-gray-100 rounded-md flex items-center justify-center">
//                       <img
//                         src={face.faceUrl}
//                         alt={`Customer face ${index + 1}`}
//                         className="max-h-full max-w-full object-contain transition-transform duration-200 hover:scale-110"
//                         title={`Similarity: ${face.similarity.toFixed(2)}%`}
//                       />
//                       <div className="absolute top-2 right-2">
//                         {face.isMatch ? (
//                           <svg className="h-6 w-6 text-green-500 bg-white bg-opacity-75 rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
//                           </svg>
//                         ) : (
//                           <svg className="h-6 w-6 text-red-500 bg-white bg-opacity-75 rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
//                           </svg>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//       <div className="mt-6 flex justify-center gap-3">
//         <button
//           onClick={onClose}
//           className="p-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={handleCompareFace}
//           disabled={isLoading || !capturedFace}
//           className={`p-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 ${isLoading || !capturedFace ? 'opacity-50 cursor-not-allowed' : ''}`}
//         >
//           {isLoading ? (
//             <>
//               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//               Comparing...
//             </>
//           ) : (
//             <>
//               <Upload className="h-4 w-4" />
//               Recognize
//             </>
//           )}
//         </button>
//       </div>
//     </aside>
//   );
// });

// export default FaceRecognition;