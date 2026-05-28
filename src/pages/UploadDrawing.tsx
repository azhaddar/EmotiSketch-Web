import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { EmotionIcon } from "../components/EmotionIcon";
import { Upload, ImagePlus, ChevronRight, X } from "lucide-react";

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
  sketchId: string;
  patientId: string;
}

const EMOTIONS = ["happy", "sad", "angry", "anxious"] as const;

const EMOTION_STYLES: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  happy:   { bg: "bg-amber-50",  text: "text-amber-800",  border: "border-amber-200",  pill: "bg-amber-100 text-amber-800 border-amber-300" },
  sad:     { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200",   pill: "bg-blue-100 text-blue-800 border-blue-300" },
  angry:   { bg: "bg-red-50",    text: "text-red-800",    border: "border-red-200",    pill: "bg-red-100 text-red-800 border-red-300" },
  anxious: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", pill: "bg-purple-100 text-purple-800 border-purple-300" },
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

  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [drawingType, setDrawingType] = useState<"house" | "self">("house");
  const [preMood, setPreMood] = useState<string>("");

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
      setUserId(user.id);

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
      // admin: no filter — sees all

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
            preMood: preMood || null,
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

      const { data: sketchRow, error: insertError } = await supabase
        .from("sketches")
        .insert({
          patient_id: selectedPatientId,
          emotion,
          notes: null,
          image_url: urlData.publicUrl,
          scores: scores ?? null,
          htp_features: htpFeatures,
          pre_mood: preMood || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      setResult({
        emotion,
        scores: scores ?? {},
        htpFeatures,
        sketchId: sketchRow.id,
        patientId: selectedPatientId,
      });
    } catch (e: any) {
      setError(e.message ?? "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

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
              onChange={(e) => { setSelectedPatientId(e.target.value); setResult(null); }}
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

      {/* Step 2 — Drawing Type & Pre-Mood */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Step 2 — Drawing Type</p>
        </div>
        <div className="p-5 space-y-5">
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

          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Pre-Mood <span className="font-normal normal-case text-gray-400">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setPreMood(preMood === e ? "" : e)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${
                    preMood === e
                      ? EMOTION_STYLES[e].pill + " border-2"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
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

      {/* Results */}
      {result && <AnalysisResultPanel result={result} />}
    </div>
  );
}

function AnalysisResultPanel({ result }: { result: AnalysisResult }) {
  const navigate = useNavigate();
  const { emotion, scores, htpFeatures, patientId } = result;
  const style = EMOTION_STYLES[emotion] ?? EMOTION_STYLES.happy;

  const maxScore = Math.max(...Object.values(scores), 1);

  return (
    <div className="space-y-4">
      {/* Emotion result card */}
      <div className={`rounded-2xl border p-5 ${style.bg} ${style.border}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Analysis Result</p>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}>
            <EmotionIcon emotion={emotion} size={28} />
          </div>
          <div>
            <p className={`text-xl font-bold capitalize ${style.text}`}>{emotion}</p>
            <p className="text-xs text-gray-500">Dominant emotion detected</p>
          </div>
        </div>

        {/* Score bars */}
        <div className="space-y-2">
          {EMOTIONS.map((e) => {
            const score = scores[e] ?? 0;
            const pct = Math.round((score / maxScore) * 100);
            return (
              <div key={e} className="flex items-center gap-3">
                <p className="text-xs w-14 capitalize text-gray-600 font-medium">{e}</p>
                <div className="flex-1 bg-white/60 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${SCORE_BAR_COLORS[e]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 w-8 text-right">{score}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical observations */}
      {htpFeatures.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
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

      <button
        onClick={() => navigate(`/dashboard/children/${patientId}`)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#e13d7d] text-[#e13d7d] font-bold hover:bg-pink-50 transition-all text-sm"
      >
        View in Child Profile
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
