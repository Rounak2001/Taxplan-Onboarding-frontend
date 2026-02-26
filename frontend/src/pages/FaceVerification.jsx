import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { uploadFaceVerificationPhoto, verifyFace } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FaceVerification = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const webcamRef = useRef(null);
    const fileInputRef = useRef(null);

    // State
    const [step, setStep] = useState(1); 
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedPreview, setUploadedPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Upload your photo
    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(selected.type)) { setError('Only JPG/PNG files accepted.'); return; }
        if (selected.size > 5 * 1024 * 1024) { setError('File must be under 5MB.'); return; }
        setError('');
        setUploadedFile(selected);
        if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
        setUploadedPreview(URL.createObjectURL(selected));
    };

    const handleUploadPhoto = async () => {
        if (!uploadedFile) return;
        setUploading(true); setError('');
        try {
            const formData = new FormData();
            formData.append('uploaded_photo', uploadedFile);
            await uploadFaceVerificationPhoto(user?.id, formData);
            setStep(2);
        } catch (err) { setError('Upload failed. Please try again.'); console.error(err); }
        finally { setUploading(false); }
    };

    // Step 2: Live webcam capture & verify
    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) setCapturedImage(imageSrc);
    }, []);

    const handleVerify = async () => {
        if (!capturedImage) return;
        setVerifying(true); setError('');
        try {
            const result = await verifyFace(user?.id, { live_photo_base64: capturedImage });
            if (result.match) {
                updateUser({ ...user, is_verified: true });
                navigate('/success');
            } else {
                setError(`Face did not match (similarity: ${result.similarity?.toFixed(1)}%). Please try again.`);
                setCapturedImage(null);
            }
        } catch (err) { setError('Verification failed. Make sure your face is clearly visible.'); console.error(err); }
        finally { setVerifying(false); }
    };

    const btnPrimary = (disabled) => ({
        flex: 1, padding: '12px 0', borderRadius: 8, fontWeight: 600, fontSize: 14,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#e5e7eb' : '#059669', color: disabled ? '#9ca3af' : '#fff',
    });

    const btnSecondary = {
        flex: 1, padding: '12px 0', borderRadius: 8, fontWeight: 500, fontSize: 14,
        border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: '#059669', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>T</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>Taxplan Advisor</span>
                </div>
            </header>

            <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 32px 60px' }}>
                <div style={{ marginBottom: 28 }}>
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>Step 3 of 5</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Face Verification</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                        {step === 1 ? 'Upload a clear photo of yourself, then we\'ll compare it with a live capture.' : 'Now take a live photo using your webcam to verify your identity.'}
                    </p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#059669' }}></div>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 2 ? '#059669' : '#e5e7eb' }}></div>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                    {step === 1 ? (
                        /* Step 1: Upload photo */
                        <>
                            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>① Upload Your Photo</h2>
                            {!uploadedPreview ? (
                                <div onClick={() => fileInputRef.current?.click()} style={{
                                    border: '2px dashed #d1d5db', borderRadius: 12, padding: '48px 24px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                                }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>🤳</div>
                                    <p style={{ fontWeight: 500, color: '#374151', marginBottom: 4 }}>Click to upload a photo of yourself</p>
                                    <p style={{ fontSize: 13, color: '#9ca3af' }}>JPG or PNG • Max 5MB • Clear face visible</p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
                                        <img src={uploadedPreview} alt="Your photo" style={{ maxHeight: 300, margin: '0 auto', display: 'block', objectFit: 'contain', padding: 16 }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button onClick={() => { setUploadedFile(null); if (uploadedPreview) URL.revokeObjectURL(uploadedPreview); setUploadedPreview(null); }}
                                            style={btnSecondary}>Choose Different</button>
                                        <button onClick={handleUploadPhoto} disabled={uploading} style={btnPrimary(uploading)}>
                                            {uploading ? 'Uploading...' : 'Upload & Continue →'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFileChange} style={{ display: 'none' }} />
                        </>
                    ) : (
                        /* Step 2: Live capture & verify */
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>② Live Webcam Capture</h2>
                                <button
                                    onClick={() => setStep(1)}
                                    style={{ fontSize: 13, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    ← Change Reference Photo
                                </button>
                            </div>
                            <div style={{ aspectRatio: '16/9', background: '#111827', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                                {capturedImage ? (
                                    <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} mirrored={true} />
                                )}
                            </div>

                            {!capturedImage ? (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb', marginBottom: 16 }}>
                                        <span>💡</span><span>Position your face clearly in the frame with good lighting.</span>
                                    </div>
                                    <button onClick={capture} style={{ ...btnPrimary(false), width: '100%', flex: 'none' }}>
                                        📸 Capture Photo
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button onClick={() => setCapturedImage(null)} style={btnSecondary}>Retake</button>
                                    <button onClick={handleVerify} disabled={verifying} style={btnPrimary(verifying)}>
                                        {verifying ? 'Verifying...' : 'Verify Face →'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {error && <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#dc2626' }}>{error}</div>}
            </div>
        </div>
    );
};

export default FaceVerification;
