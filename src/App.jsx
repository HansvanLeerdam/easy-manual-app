import React, { useEffect, useState, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import QRCode from "react-qr-code";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
  Video as VideoIcon,
  ArrowLeft,
  Home,
  Edit3,
  MoreHorizontal,
  Upload,
  Download,
} from "lucide-react";

// 🔗 Firestore
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

/* -------------------- Helpers & Store -------------------- */
const defaultOrg = { name: "My Company", logo: "" };

const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const fmtDate = (ts) => new Date(ts).toLocaleString();

const STORE_KEY = "ema_store_v1";
const loadStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { manuals: [] };
  } catch {
    return { manuals: [] };
  }
};
const saveStore = (s) => localStorage.setItem(STORE_KEY, JSON.stringify(s));

const useStore = () => {
  const [store, setStore] = useState(loadStore());
  useEffect(() => saveStore(store), [store]);
  return [store, setStore];
};

/* -------------------- Layout -------------------- */
function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r bg-gray-50 min-h-screen p-4 hidden md:block">
      <Link to="/" className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-black text-white grid place-items-center font-bold">
          EM
        </div>
        <div className="leading-tight">
          <div className="font-semibold">Easy Manual App</div>
          <div className="text-xs text-gray-500">Create & share SOPs</div>
        </div>
      </Link>
      <nav className="grid gap-2">
        <Link className="px-3 py-2 rounded-lg hover:bg-gray-200" to="/">
          My Library
        </Link>
      </nav>
    </aside>
  );
}

function TopBar({ onCreate, onExport, onImport }) {
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const manuals = JSON.parse(reader.result);
        onImport(manuals);
      } catch {
        alert("Invalid file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="sticky top-0 z-10 bg-white border-b">
      <div className="max-w-6xl mx-auto flex items-center gap-3 p-3">
        <input
          placeholder="Search for manuals…"
          className="border rounded-md px-3 py-2 flex-1"
        />
        <label className="border px-3 py-2 rounded-md cursor-pointer flex items-center gap-2 hover:bg-gray-100">
          <Upload className="w-4 h-4" /> Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </label>
        <button
          onClick={onExport}
          className="border px-3 py-2 rounded-md flex items-center gap-2 hover:bg-gray-100"
        >
          <Download className="w-4 h-4" /> Export
        </button>
        <button
          onClick={onCreate}
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>
    </div>
  );
}

/* -------------------- Library -------------------- */
function ManualCard({ m }) {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow transition bg-white">
      <Link to={`/manual/${m.id}`} className="flex items-center gap-4 p-3">
        <div className="h-16 w-24 bg-gray-200 overflow-hidden rounded-md">
          {m.steps?.[0]?.mediaSrc ? (
            m.steps[0].mediaType === "image" ? (
              <img
                src={m.steps[0].mediaSrc}
                alt="thumb"
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={m.steps[0].mediaSrc}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="h-full w-full grid place-items-center text-sm text-gray-500">
              No media
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {m.title || "Untitled manual"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            Last edited {fmtDate(m.updatedAt)}
          </div>
        </div>
      </Link>
      <div className="border-t p-2 flex justify-end gap-2">
        <Link
          to={`/editor/${m.id}`}
          className="text-sm border px-2 py-1 rounded-md hover:bg-gray-100 flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> Edit
        </Link>
        <Link
          to={`/manual/${m.id}`}
          className="text-sm border px-2 py-1 rounded-md hover:bg-gray-100 flex items-center gap-1"
        >
          <Home className="w-3 h-3" /> Open
        </Link>
      </div>
    </div>
  );
}

function LibraryPage() {
  const navigate = useNavigate();
  const [store, setStore] = useStore();

  function onCreate() {
    const id = uuidv4();
    const manual = {
      id,
      title: "New Manual",
      subtitle: "",
      org: defaultOrg,
      steps: [
        { id: uuidv4(), title: "", description: "", mediaType: "none", mediaSrc: "" },
      ],
      updatedAt: Date.now(),
      views: 0,
    };
    setStore((s) => {
      const updated = { ...s, manuals: [manual, ...s.manuals] };
      localStorage.setItem(STORE_KEY, JSON.stringify(updated));
      return updated;
    });
    setTimeout(() => navigate(`/editor/${id}`), 100);
  }

  function exportManuals() {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(store.manuals));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "easy-manuals-backup.json";
    a.click();
  }

  function importManuals(manuals) {
    setStore((s) => ({ ...s, manuals }));
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen">
        <TopBar onCreate={onCreate} onExport={exportManuals} onImport={importManuals} />
        <div className="max-w-4xl mx-auto p-4 grid gap-4">
          <h1 className="text-2xl font-semibold">My Library</h1>
          <div className="grid gap-3">
            {store.manuals.length ? (
              store.manuals.map((m) => <ManualCard key={m.id} m={m} />)
            ) : (
              <div className="text-gray-500 text-sm border rounded-md p-6">
                No manuals yet. Click <strong>Create</strong> to start.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Step Card -------------------- */
function StepCard({ step, index, onChange, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className="border rounded-md p-3 mb-3 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center font-semibold text-sm">
          Step {index + 1}:
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Step title"
            value={step.title}
            onChange={(e) => onChange({ ...step, title: e.target.value })}
          />
        </div>
        <div className="flex gap-1">
          <button onClick={onMoveUp} className="p-1 hover:bg-gray-100 rounded">
            <MoveUp className="w-4 h-4" />
          </button>
          <button onClick={onMoveDown} className="p-1 hover:bg-gray-100 rounded">
            <MoveDown className="w-4 h-4" />
          </button>
          <button onClick={onRemove} className="p-1 hover:bg-gray-100 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <textarea
        className="border rounded-md w-full p-2 text-sm mb-2"
        placeholder="Describe what to do in this step..."
        value={step.description}
        onChange={(e) => onChange({ ...step, description: e.target.value })}
      />
      <div className="flex gap-2 text-sm">
        <label className="cursor-pointer flex items-center gap-1">
          <ImageIcon className="w-4 h-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f)
                onChange({
                  ...step,
                  mediaType: "image",
                  mediaSrc: await fileToDataURL(f),
                });
            }}
          />
          Image
        </label>
        <label className="cursor-pointer flex items-center gap-1">
          <VideoIcon className="w-4 h-4" />
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f)
                onChange({
                  ...step,
                  mediaType: "video",
                  mediaSrc: await fileToDataURL(f),
                });
            }}
          />
          Video
        </label>
        {step.mediaSrc && (
          <button
            className="ml-auto text-xs text-red-500"
            onClick={() =>
              onChange({ ...step, mediaSrc: "", mediaType: "none" })
            }
          >
            Remove media
          </button>
        )}
      </div>
      {step.mediaSrc && step.mediaType === "image" && (
        <img
          src={step.mediaSrc}
          alt="step"
          className="rounded-md mt-2 max-h-64 object-contain"
        />
      )}
      {step.mediaSrc && step.mediaType === "video" && (
        <video src={step.mediaSrc} controls className="rounded-md mt-2 max-h-64" />
      )}
    </div>
  );
}

/* -------------------- Editor (Save → Firestore) -------------------- */
function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useStore();
  const manualIndex = store.manuals.findIndex((m) => m.id === id);
  const manual = store.manuals[manualIndex];
  const [title, setTitle] = useState(manual?.title || "");
  const [steps, setSteps] = useState(manual?.steps || []);
  const [isSaved, setIsSaved] = useState(false);

  if (!manual) return <div className="p-6">Manual not found.</div>;

  async function handleSave() {
    const updated = {
      ...manual,
      title,
      steps,
      updatedAt: Date.now(),
      version: (manual.version || 0) + 1,
    };

    // 1) Save locally (keeps Library responsive)
    const arr = [...store.manuals];
    arr[manualIndex] = updated;
    setStore({ ...store, manuals: arr });

    // 2) Publish to Firestore (shareable via /manual/:id)
    await setDoc(doc(db, "manuals", updated.id), updated);

    setIsSaved(true);
    // brief feedback then go back to Library
    setTimeout(() => {
      setIsSaved(false);
      navigate("/");
    }, 1200);
  }

  // Progress bar calc
  const totalSteps = 3;
  const hasMedia = steps.some((s) => s.mediaSrc);
  const hasText = title.trim() || steps.some((s) => s.description.trim());
  const progress =
    (hasMedia ? 1 : 0) + (hasText ? 1 : 0) + (isSaved ? 1 : 0);
  const percent = Math.round((progress / totalSteps) * 100);

  const link = `${window.location.origin}/manual/${manual.id}`;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen p-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h1 className="text-2xl font-semibold">
            Editing: {title || "Untitled manual"}
          </h1>
          <button
            onClick={handleSave}
            className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800"
          >
            💾 Save Manual
          </button>
        </div>

        {/* 3-step progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
            <span className={hasMedia ? "text-green-600" : ""}>1. Add Media</span>
            <span className={hasText ? "text-green-600" : ""}>2. Add Text</span>
            <span className={isSaved ? "text-green-600" : ""}>3. Save & Share</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-green-600 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Show QR right after saving (for quick scan) */}
        {isSaved && (
          <div className="border rounded-md p-3 mb-4 inline-block">
            <QRCode value={link} size={128} />
            <div className="text-xs mt-2 break-all text-gray-500 max-w-xs">
              {link}
            </div>
          </div>
        )}

        {/* Title */}
        <input
          className="border rounded-md px-3 py-2 w-full mb-4"
          placeholder="Manual title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Steps */}
        {steps.map((s, i) => (
          <StepCard
            key={s.id}
            step={s}
            index={i}
            onChange={(next) =>
              setSteps((arr) => arr.map((st) => (st.id === s.id ? next : st)))
            }
            onRemove={() => setSteps((arr) => arr.filter((st) => st.id !== s.id))}
            onMoveUp={() => {
              if (i === 0) return;
              setSteps((arr) => {
                const copy = [...arr];
                const [item] = copy.splice(i, 1);
                copy.splice(i - 1, 0, item);
                return copy;
              });
            }}
            onMoveDown={() => {
              if (i === steps.length - 1) return;
              setSteps((arr) => {
                const copy = [...arr];
                const [item] = copy.splice(i, 1);
                copy.splice(i + 1, 0, item);
                return copy;
              });
            }}
          />
        ))}

        {/* Add step */}
        <button
          onClick={() =>
            setSteps((arr) => [
              ...arr,
              {
                id: uuidv4(),
                title: "",
                description: "",
                mediaType: "none",
                mediaSrc: "",
              },
            ])
          }
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 mt-4"
        >
          <Plus className="w-4 h-4" /> Add step
        </button>
      </div>
    </div>
  );
}

/* -------------------- Reader (loads from Firestore if needed) -------------------- */
function ReaderView({ manual }) {
  const navigate = useNavigate();
  return (
    <div className="w-full">
      <div className="flex justify-end p-2 gap-2 border-b bg-white">
        <button onClick={() => navigate(-1)} className="border rounded p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/")} className="border rounded p-2">
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        <header className="px-4 py-6">
          <h1 className="text-3xl font-semibold">{manual.title}</h1>
        </header>

        {manual.steps?.map((s, i) => (
          <section key={s.id || i} className="grid md:grid-cols-2 gap-0 border-t">
            <div className="bg-gray-50 p-4">
              {s.mediaSrc ? (
                s.mediaType === "image" ? (
                  <img
                    src={s.mediaSrc}
                    alt={`step-${i + 1}`}
                    className="rounded-xl w-full object-cover max-h-[70vh] mx-auto"
                  />
                ) : (
                  <video
                    src={s.mediaSrc}
                    controls
                    playsInline
                    className="rounded-xl w-full max-h-[70vh] mx-auto"
                  />
                )
              ) : (
                <div className="h-64 grid place-items-center text-gray-400">
                  No media
                </div>
              )}
            </div>
            <div className="p-6 md:p-10 bg-white">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MoreHorizontal className="w-4 h-4" />
                <span>Step {i + 1}</span>
              </div>
              <h2 className="text-2xl font-semibold mb-3">
                {s.title || `Step ${i + 1}`}
              </h2>
              <p className="whitespace-pre-wrap text-gray-800">{s.description}</p>
              <div className="text-xs text-gray-500 mt-8">
                {i + 1} / {manual.steps.length}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ManualReaderRoute() {
  const { id } = useParams();
  const [store] = useStore();
  const localManual = store.manuals.find((m) => m.id === id) || null;

  const [manual, setManual] = useState(localManual);
  const [loading, setLoading] = useState(!localManual);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchManual() {
      if (localManual) return; // already have it
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "manuals", id));
        if (!ignore) {
          if (snap.exists()) {
            setManual(snap.data());
          } else {
            setError("Manual not found.");
          }
        }
      } catch (e) {
        if (!ignore) setError("Could not load this manual.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchManual();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6">{error}</div>;
  if (!manual) return <div className="p-6">Manual not found.</div>;

  return <ReaderView manual={manual} />;
}

/* Optional: keep encoded read route for “portable link” use-cases */
function ManualReadEncodedRoute() {
  const [params] = useSearchParams();
  const m = params.get("m");
  if (!m) return <div className="p-6">No manual provided.</div>;
  try {
    // kept for backwards compatibility if you later add an encoded link flow
    const json = decodeURIComponent(m);
    const manual = JSON.parse(json);
    return <ReaderView manual={manual} />;
  } catch {
    return <div className="p-6">Invalid manual link.</div>;
  }
}

/* -------------------- Main App -------------------- */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/manual/:id" element={<ManualReaderRoute />} />
        <Route path="/read" element={<ManualReadEncodedRoute />} />
        <Route path="*" element={<div className="p-6">Not found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
