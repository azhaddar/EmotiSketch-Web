import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { EmotionIcon } from "../components/EmotionIcon";
import { Upload, ImagePlus, X, CheckCircle, ChevronRight } from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  age: number;
  gender: string;
}

interface HtpFeature {
  category: string;
  observation: string;
  interpretation: string;
  severity: number;
}

interface AnalysisResult {
  emotion: "happy" | "sad" | "angry" | "anxious";
  scores: Record<string, number>;
  htpFeatures: HtpFeature[];
  patientId: string;
}

const EMOTIONS = ["happy", "sad", "angry", "anxious"] as const;

const EMOTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  happy:   { bg: "bg-amber-50",  text: "text-amber-800",  border: "border-amber-200" },
  sad:     { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200" },
  angry:   { bg: "bg-red-50",    text: "text-red-800",    border: "border-red-200" },
  anxious: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
};

const SCORE_BAR_COLORS: Record<string, string> = {
  happy:   "bg-amber-400",
  sad:     "bg-blue-400",
  angry:   "bg-red-400",
  anxious: "bg-purple-400",
};

function getSeverityMeta(severity: number) {
  if (severity >= 7) return { label: "Significant", color: "bg-red-100 text-red-700" };
  if (severity >= 4) return { label: "Noteworthy", color: "bg-amber-100 text-amber-700" };
  return { label: "Contextual", color: "bg-gray-100 text-gray-600" };
}

export default function UploadDrawing() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [role, setRole] = useState<string>("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [drawingType, setDrawingType] = useState<"house" | "self">("house");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const userRole = (profile?.role || "user").toLowerCase();
      setRole(userRole);

      let query = supabase.from("patients").select("id, full_name, age, gender");

      if (userRole === "user" || userRole === "parent") {
        query = query.eq("guardian_id", user.id);
      } else if (userRole === "therapist") {
        query = query.eq("therapist_id", user.id);
      }
      // admin: no filter

      const { data } = await query.order("full_name");
      setPatients(data ?? []);
      setLoadingPatients(false);
    }
    init();
  }, []);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setImageFile(file);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  function clearImage() {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    setSelectedPatientId("");
    setDrawingType("house");
    clearImage();
    setError("");
    setResult(null);
  }

  async function handleAnalyze() {
    if (!selectedPatientId) { setError("Please select a child."); return; }
    if (!imageFile) { setError("Please upload a drawing image."); return; }

    setError("");
    setAnalyzing(true);
    setResult(null);

    try {
      const base64 = await fileToBase64(imageFile);
      const filename = `${selectedPatientId}/${Date.now()}.jpg`;

      const [uploadResult, analyzeResult] = await Promise.all([
        supabase.storage
          .from("sketch-images")
          .upload(filename, imageFile, { contentType: imageFile.type }),
        supabase.functions.invoke("analyze-sketch", {
          body: {
            imageBase64: base64,
            promptType: drawingType,
            preMood: null,
          },
        }),
      ]);

      if (uploadResult.error) throw uploadResult.error;
      if (analyzeResult.error) throw analyzeResult.error;

      if (analyzeResult.data?.valid === false) {
        setError(analyzeResult.data.message ?? "Drawing type mismatch. Please try a different image.");
        setAnalyzing(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("sketch-images")
        .getPublicUrl(filename);

      const emotion = analyzeResult.data?.emotion ?? "happy";
      const scores = analyzeResult.data?.scores ?? null;
      const htpFeatures = analyzeResult.data?.htpFeatures ?? [];

      const { error: insertError } = await supabase
        .from("sketches")
        .insert({
          patient_id: selectedPatientId,
          emotion,
          notes: null,
          image_url: urlData.publicUrl,
          scores: scores ?? null,
          htp_features: htpFeatures,
        });

      if (insertError) throw insertError;

      setResult({
        emotion,
        scores: scores ?? {},
        htpFeatures,
        patientId: selectedPatientId,
      });
    } catch (e: any) {
      setError(e.message ?? "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  const isTherapistOrAdmin = role === "therapist" || role === "admin";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Drawing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a photo of a paper drawing for AI emotion analysis.
        </p>
      </div>

      {/* Step 1 — Select Child */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Step 1 — Select Child</p>
        </div>
        <div className="p-5">
          {loadingPatients ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : patients.length === 0 ? (
            <p className="text-sm text-gray-500">No children found. Add a child first.</p>
          ) : (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm bg-white"
            >
              <option value="">— Select a child —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} (Age {p.age}, {p.gender})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Step 2 — Drawing Type */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Step 2 — Drawing Type</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            {(["house", "self"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDrawingType(type)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  drawingType === type
                    ? "border-[#e13d7d] bg-pink-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className={`text-sm font-bold ${drawingType === type ? "text-[#e13d7d]" : "text-gray-700"}`}>
                  {type === "house" ? "House" : "Self-Portrait"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {type === "house" ? "House, tree & person" : "Person / figure drawing"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3 — Upload Image */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Step 3 — Upload Drawing</p>
        </div>
        <div className="p-5">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Drawing preview"
                className="w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow border border-gray-200 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center truncate">{imageFile?.name}</p>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? "border-[#e13d7d] bg-pink-50"
                  : "border-gray-200 hover:border-[#e13d7d] hover:bg-pink-50/40"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                <ImagePlus size={24} className="text-[#e13d7d]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Drop image here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC — photo of a paper drawing</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={analyzing || !selectedPatientId || !imageFile}
        className="w-full bg-[#e13d7d] text-white py-3 rounded-xl font-bold hover:bg-[#c42f6a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {analyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <Upload size={18} />
            Analyze Drawing
          </>
        )}
      </button>

      {/* Success Modal */}
      {result && (
        <SuccessModal
          result={result}
          showClinical={isTherapistOrAdmin}
          onClose={resetForm}
          onViewProfile={() => navigate(`/dashboard/children/${result.patientId}`)}
        />
      )}
    </div>
  );
}

function SuccessModal({
  result,
  showClinical,
  onClose,
  onViewProfile,
}: {
  result: AnalysisResult;
  showClinical: boolean;
  onClose: () => void;
  onViewProfile: () => void;
}) {
  const { emotion, scores, htpFeatures } = result;
  const style = EMOTION_STYLES[emotion] ?? EMOTION_STYLES.happy;
  const maxScore = Math.max(...Object.values(scores), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={22} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Analysis Complete</p>
              <p className="text-xs text-gray-500">Drawing submitted successfully</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Emotion result */}
          <div className={`m-4 rounded-xl border p-4 ${style.bg} ${style.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${style.border} ${style.bg}`}>
                <EmotionIcon emotion={emotion} size={24} />
              </div>
              <div>
                <p className={`text-lg font-bold capitalize ${style.text}`}>{emotion}</p>
                <p className="text-xs text-gray-500">Dominant emotion detected</p>
              </div>
            </div>
            <div className="space-y-2">
              {EMOTIONS.map((e) => {
                const score = scores[e] ?? 0;
                const pct = Math.round((score / maxScore) * 100);
                return (
                  <div key={e} className="flex items-center gap-3">
                    <p className="text-xs w-14 capitalize text-gray-600 font-medium">{e}</p>
                    <div className="flex-1 bg-white/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${SCORE_BAR_COLORS[e]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 w-8 text-right">{score}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical observations — therapist/admin only */}
          {showClinical && htpFeatures.length > 0 && (
            <div className="mx-4 mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Clinical Observations</p>
                <p className="text-xs text-gray-400 mt-0.5">Based on AD-HTP methodology</p>
              </div>
              <div className="divide-y divide-gray-50">
                {htpFeatures.map((f, i) => {
                  const sev = getSeverityMeta(f.severity);
                  return (
                    <div key={i} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{f.category}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.color}`}>
                          {sev.label} · {f.severity}/10
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{f.observation}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{f.interpretation}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Upload Another
          </button>
          <button
            onClick={onViewProfile}
            className="flex-1 py-2.5 rounded-xl bg-[#e13d7d] text-white text-sm font-bold hover:bg-[#c42f6a] transition-all flex items-center justify-center gap-1.5"
          >
            View Profile
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
