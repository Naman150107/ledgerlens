import React, { useState, useEffect } from "react";
import { 
  fetchEntries, 
  saveEntries, 
  deleteEntry, 
  isSupabaseConfigured 
} from "./lib/supabaseClient";
import { 
  Upload, LayoutDashboard, Camera, Database, 
  MessageCircle, QrCode, Trash2, Edit2, AlertCircle, 
  CheckCircle, Plus, DollarSign, Users, ChevronRight, X, Copy, RefreshCw, Smartphone,
  ArrowUpDown, ArrowUp, ArrowDown, Sparkles
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, AreaChart, Area, Cell
} from "recharts";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'dashboard' | 'scan'

  // Sort State
  const [sortField, setSortField] = useState("date"); // 'name' | 'date' | 'description' | 'amount'
  const [sortDirection, setSortDirection] = useState("desc");

  // Data State
  const [entries, setEntries] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  // Scanner State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState([]);
  const [isExtracted, setIsExtracted] = useState(false);
  const [extractionError, setExtractionError] = useState("");

  // Modals State
  const [whatsappModal, setWhatsappModal] = useState({ open: false, entry: null, phone: "" });
  const [upiModal, setUpiModal] = useState({ open: false, entry: null, upiId: "merchant@upi" });
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  // Fetch initial data
  useEffect(() => {
    loadData();
    setIsSupabaseActive(isSupabaseConfigured());
  }, []);

  // Smooth scroll to review section on mobile when extraction starts or completes
  useEffect(() => {
    if (isExtracting || isExtracted) {
      setTimeout(() => {
        const el = document.getElementById("review-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [isExtracting, isExtracted]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const res = await fetchEntries();
      if (res.success) {
        setEntries(res.data || []);
      } else {
        showError("Failed to fetch entries from database.");
      }
    } catch (err) {
      showError("Error loading ledger entries.");
    } finally {
      setLoadingData(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 4000);
  };

  const showError = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(""), 4000);
  };

  // Image Upload handler
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setIsExtracted(false);
      setExtractedEntries([]);
      setExtractionError("");
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setIsExtracted(false);
      setExtractedEntries([]);
      setExtractionError("");
    }
  };

  // Read file as base64 helper
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // AI Extraction call
  const triggerExtraction = async () => {
    if (!file) return;
    setIsExtracting(true);
    setExtractionError("");
    try {
      const base64Image = await getBase64(file);
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          mimeType: file.type
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Backend returned an error.");
      }

      const data = await res.json();
      if (data.warning) {
        showError(data.warning);
      }
      setExtractedEntries(data.entries || []);
      setIsExtracted(true);
    } catch (err) {
      console.error(err);
      setExtractionError(err.message || "Failed to parse ledger page. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Edit fields inside review table
  const handleEditEntry = (index, field, value) => {
    const updated = [...extractedEntries];
    if (field === "amount") {
      updated[index][field] = parseFloat(value) || 0;
    } else if (field === "confidence") {
      updated[index][field] = parseFloat(value) || 1.0;
    } else {
      updated[index][field] = value;
    }
    setExtractedEntries(updated);
  };

  // Delete entry in review list
  const handleDeleteExtracted = (index) => {
    const updated = extractedEntries.filter((_, idx) => idx !== index);
    setExtractedEntries(updated);
  };

  // Add row to review list
  const handleAddRow = () => {
    const today = new Date().toISOString().split("T")[0];
    setExtractedEntries([
      ...extractedEntries,
      { name: "New Customer", date: today, description: "New Item", amount: 100, confidence: 1.0 }
    ]);
  };

  // Save reviewed entries to DB
  const handleConfirmSave = async () => {
    if (extractedEntries.length === 0) return;
    try {
      const res = await saveEntries(extractedEntries);
      if (res.success) {
        showSuccess(`Successfully saved ${extractedEntries.length} entries!`);
        setFile(null);
        setPreview(null);
        setIsExtracted(false);
        setExtractedEntries([]);
        loadData();
        setActiveTab("dashboard");
      } else {
        showError("Failed to save entries.");
      }
    } catch (err) {
      showError("Error saving transactions.");
    }
  };

  // Delete live transaction
  const handleDeleteLiveEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await deleteEntry(id);
      if (res.success) {
        showSuccess("Transaction deleted.");
        loadData();
      } else {
        showError("Failed to delete entry.");
      }
    } catch (err) {
      showError("Error deleting transaction.");
    }
  };

  // Statistics Calculations
  const outstandingAmount = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalEntriesCount = entries.length;
  const uniqueCustomers = new Set(entries.map(e => e.name.trim().toLowerCase())).size;

  // Chart data: Outstanding amount per customer (Top 6)
  const customerDuesMap = entries.reduce((acc, e) => {
    const name = e.name.trim();
    acc[name] = (acc[name] || 0) + (parseFloat(e.amount) || 0);
    return acc;
  }, {});

  const chartData = Object.entries(customerDuesMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Colors mapping for charts (Sleek Stripi theme stops)
  const COLORS = ["#533afd", "#665efd", "#ea2261", "#f96bee", "#9b6829", "#4434d4"];

  // WhatsApp reminder generator
  const getWhatsAppLink = (entry, phone) => {
    const upiLink = `upi://pay?pa=${upiModal.upiId}&pn=LedgerLens&am=${entry.amount}&cu=INR`;
    const message = `Hi ${entry.name}, this is a reminder from our shop. Outstanding balance of Rs. ${entry.amount} is due for "${entry.description}" bought on ${entry.date}. Please clear it using this UPI link: ${upiLink}. Thank you!`;
    const encodedText = encodeURIComponent(message);
    const cleanedPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    return cleanedPhone 
      ? `https://wa.me/${cleanedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
  };

  // UPI Link generator
  const getUpiUri = (entry, upiId) => {
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(entry.name)}&am=${entry.amount}&tn=${encodeURIComponent(entry.description || "dues")}&cu=INR`;
  };

  // Sort toggle handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Get sorted entries to display
  const getSortedEntries = () => {
    return [...entries].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "amount") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = (aVal || "").toString().toLowerCase();
        bVal = (bVal || "").toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-canvas-soft text-ink relative pb-16">
      
      {/* Background Gradient Mesh Backdrop */}
      <div className={`absolute top-0 left-0 right-0 transition-all duration-500 ease-in-out gradient-mesh opacity-90 z-0 ${activeTab === "home" ? "h-[640px]" : "h-64"}`}></div>

      {/* Header Floating Navbar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white/80 backdrop-blur-md border border-hairline rounded-xl px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between shadow-[rgba(0,55,112,0.06)_0px_8px_24px]">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-soft flex items-center justify-center text-white shadow-[0_4px_12px_rgba(83,58,253,0.25)] border border-white/10 shrink-0">
              <svg className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                <circle cx="15.5" cy="16" r="1.5" fill="#ea2261" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-base sm:text-xl font-semibold tracking-tight text-ink select-none">
                Ledger<span className="text-primary font-light">Lens</span>
              </h1>
              <p className="hidden xs:block text-[8px] sm:text-[10px] text-ink-mute uppercase tracking-widest font-semibold">
                AI Shop Register Scanner
              </p>
            </div>
          </div>

          {activeTab === "home" ? (
            /* Home Landing Page navigation links */
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <button 
                onClick={() => { setActiveTab("dashboard"); loadData(); }} 
                className="hidden sm:inline-block text-xs font-semibold text-ink-secondary hover:text-primary transition cursor-pointer"
              >
                Features
              </button>
              <button 
                onClick={() => { setActiveTab("dashboard"); loadData(); }} 
                className="hidden sm:inline-block text-xs font-semibold text-ink-secondary hover:text-primary transition cursor-pointer"
              >
                Analytics
              </button>
              <button 
                onClick={() => { setActiveTab("dashboard"); loadData(); }} 
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary-deep text-white text-[10px] sm:text-xs font-semibold rounded-pill shadow-sm transition transform hover:-translate-y-0.5 duration-150 cursor-pointer"
              >
                Open Dashboard
              </button>
            </div>
          ) : (
            /* Workspace Dashboard Page navigation / tabs */
            <div className="flex items-center gap-2 sm:gap-3">
              <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isSupabaseActive 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                <Database className="w-3.5 h-3.5" />
                {isSupabaseActive ? "Supabase Connected" : "Local Storage Demo"}
              </span>

              {/* View Tabs */}
              <div className="flex bg-canvas-soft p-0.5 sm:p-1 rounded-pill border border-hairline">
                <button 
                  onClick={() => { setActiveTab("dashboard"); loadData(); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-pill text-xs sm:text-sm transition-all duration-200 font-medium cursor-pointer ${
                    activeTab === "dashboard" 
                      ? "bg-white text-primary shadow-sm" 
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Dashboard</span>
                </button>
                <button 
                  onClick={() => setActiveTab("scan")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-pill text-xs sm:text-sm transition-all duration-200 font-medium cursor-pointer ${
                    activeTab === "scan" 
                      ? "bg-white text-primary shadow-sm" 
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Scan Register</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 flex-grow">
        
        {/* --- LANDING PAGE TAB --- */}
        {activeTab === "home" && (
          <div className="space-y-20 pb-20 animate-fadeIn select-none">
            {/* Hero content */}
            <div className="text-center max-w-3xl mx-auto pt-16 sm:pt-24 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                Next-Gen Shop Digitization
              </span>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-ink leading-tight px-2">
                Handwritten ledgers,<br className="hidden sm:inline" />
                <span className="font-normal text-primary"> digitized in seconds.</span>
              </h2>
              <p className="text-sm sm:text-lg text-ink-secondary max-w-xl mx-auto leading-relaxed font-sans px-4">
                Scan your shop's paper registers. Gemini AI transcribes customer transactions, formats dues, and generates instant UPI payment reminder links.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-4 px-6 max-w-md mx-auto sm:max-w-none">
                <button 
                  onClick={() => { setActiveTab("dashboard"); loadData(); }}
                  className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-deep text-white font-medium rounded-pill shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition duration-200 text-sm flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Open Dashboard
                  <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition duration-150" />
                </button>
                <button 
                  onClick={() => setActiveTab("scan")}
                  className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-canvas-soft text-primary font-medium rounded-pill border border-hairline hover:border-primary/30 shadow-sm transform hover:-translate-y-0.5 transition duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4.5 h-4.5" />
                  Scan Register
                </button>
              </div>
            </div>

            {/* Faux Dashboard Mockup */}
            <div className="max-w-5xl mx-auto relative rounded-2xl overflow-hidden border border-hairline shadow-2xl bg-white p-2">
              <div className="bg-canvas-soft border border-hairline rounded-xl p-4 sm:p-6 space-y-6">
                {/* Mock header */}
                <div className="flex items-center justify-between border-b border-hairline pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                    <span className="w-3 h-3 rounded-full bg-green-400"></span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-ink-mute font-medium bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md border border-hairline truncate max-w-[150px] sm:max-w-none">ledgerlens.app/dashboard</span>
                  <div className="hidden sm:block w-16"></div>
                </div>
                
                {/* Mock content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-brand-dark text-white rounded-xl p-4 space-y-1">
                    <p className="text-[10px] uppercase text-primary-subdued/80 font-bold">Outstanding dues</p>
                    <p className="text-2xl font-light">₹24,850.00</p>
                  </div>
                  <div className="bg-white border border-hairline rounded-xl p-4 space-y-1">
                    <p className="text-[10px] uppercase text-ink-mute font-bold">Active Debtors</p>
                    <p className="text-2xl font-light text-ink">12 Customers</p>
                  </div>
                  <div className="bg-white border border-hairline rounded-xl p-4 space-y-1">
                    <p className="text-[10px] uppercase text-ink-mute font-bold">Confidence score</p>
                    <p className="text-2xl font-light text-emerald-600">98.4% AI Match</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Breakdown */}
            <div className="space-y-12">
              <div className="text-center max-w-xl mx-auto space-y-2 px-4">
                <h3 className="text-2xl font-light tracking-tight text-ink">Engineered for Shopkeepers & Merchants</h3>
                <p className="text-xs text-ink-mute">Everything you need to eliminate paper register overheads.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
                <div className="bg-white rounded-xl border border-hairline p-6 space-y-3 shadow-sm hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-ink">Gemini Intelligent Extraction</h4>
                  <p className="text-xs text-ink-mute leading-relaxed">
                    Simply take a photo. Our advanced Gemini multi-modal processing reads cursive handwriting, tabular logs, dates, and amounts with precision.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-hairline p-6 space-y-3 shadow-sm hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-lg bg-ruby/10 flex items-center justify-center text-ruby">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-ink">Interactive Debt Ledger</h4>
                  <p className="text-xs text-ink-mute leading-relaxed">
                    View individual customer balances, filter, search, and sort records. Track outstanding totals in real-time on a modern financial dashboard.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-hairline p-6 space-y-3 shadow-sm hover:shadow-md transition">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-ink">Seamless Payments & Reminders</h4>
                  <p className="text-xs text-ink-mute leading-relaxed">
                    Generate WhatsApp messages populated with customized details. Create QR codes linking directly to merchant UPI payment apps (GPay, PhonePe, Paytm).
                  </p>
                </div>
              </div>
            </div>

            {/* Cream-Band Interlude */}
            <div className="bg-canvas-cream border border-hairline/60 rounded-2xl p-8 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm mx-4">
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-lg font-semibold text-ink">Zero Setup. Immediate Value.</h4>
                <p className="text-xs text-ink-mute max-w-md leading-relaxed">
                  LedgerLens runs securely in your browser. Start by importing a photo instantly using local storage demo cache, or link with Supabase database for persistent remote storage.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("scan")}
                className="w-full sm:w-auto px-6 py-2.5 bg-ink hover:bg-brand-dark text-white text-xs font-semibold rounded-pill shadow-lg transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                Start Scanning Now
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Footer */}
            <div className="border-t border-hairline pt-12 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-ink-mute gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">Ledger<span className="text-primary font-normal">Lens</span></span>
                <span>© {new Date().getFullYear()}</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => { setActiveTab("dashboard"); loadData(); }} className="hover:text-primary transition cursor-pointer">Features</button>
                <button onClick={() => { setActiveTab("dashboard"); loadData(); }} className="hover:text-primary transition cursor-pointer">Analytics</button>
                <a href="#" className="hover:text-primary transition">Privacy Policy</a>
              </div>
            </div>
          </div>
        )}

        {/* --- DASHBOARD TAB --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Stat 1: Total Outstanding */}
              <div className="bg-brand-dark text-white rounded-xl p-6 shadow-lg relative overflow-hidden border border-brand-dark-900">
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
                  <DollarSign className="w-40 h-40" />
                </div>
                <p className="text-xs uppercase tracking-wider text-primary-subdued font-semibold mb-2">
                  Outstanding Amount
                </p>
                <h3 className="text-3xl sm:text-4xl font-light tracking-tight tnum">
                  ₹{outstandingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-primary-subdued mt-4 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-ruby animate-pulse"></span>
                  Active credit balance across customers
                </p>
              </div>

              {/* Stat 2: Active Customers */}
              <div className="bg-white rounded-xl p-6 border border-hairline shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 text-primary">
                  <Users className="w-40 h-40" />
                </div>
                <p className="text-xs uppercase tracking-wider text-ink-mute font-semibold mb-2">
                  Total Active Customers
                </p>
                <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-ink tnum">
                  {uniqueCustomers}
                </h3>
                <p className="text-xs text-ink-mute mt-4 flex items-center gap-1">
                  Unique customer records in ledger
                </p>
              </div>

              {/* Stat 3: Total Entries */}
              <div className="bg-white rounded-xl p-6 border border-hairline shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 text-primary">
                  <Database className="w-40 h-40" />
                </div>
                <p className="text-xs uppercase tracking-wider text-ink-mute font-semibold mb-2">
                  Total Transactions
                </p>
                <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-ink tnum">
                  {totalEntriesCount}
                </h3>
                <p className="text-xs text-ink-mute mt-4 flex items-center gap-1">
                  Total scanned / logged book items
                </p>
              </div>

            </div>

            {/* Main Dashboard Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Visual Analytics */}
              <div className="lg:col-span-5 bg-white rounded-xl p-4 sm:p-6 border border-hairline shadow-sm flex flex-col min-h-[380px]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-ink">
                    Top Debtor Customers
                  </h3>
                  <p className="text-xs text-ink-mute">
                    Visual view of outstanding dues (Rs.)
                  </p>
                </div>
                
                <div className="flex-grow w-full h-[280px] min-h-[250px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData} 
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3e8ee" />
                        <XAxis type="number" stroke="#64748d" fontSize={10} tickFormatter={(v) => `₹${v}`} />
                        <YAxis dataKey="name" type="category" stroke="#64748d" fontSize={10} width={75} />
                        <Tooltip 
                          formatter={(v) => [`₹${v}`, "Outstanding"]}
                          contentStyle={{ background: "#0d253d", color: "#fff", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Bar dataKey="amount" radius={[0, 99, 99, 0]} barSize={14}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-10 h-10 text-ink-mute opacity-40 mb-2" />
                      <p className="text-sm font-medium text-ink-mute">No chart data yet</p>
                      <p className="text-xs text-ink-mute/70 mt-1 max-w-[200px]">Scan register pages to view debtor analysis.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Transactions Ledger Table */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-hairline shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      Ledger Accounts
                    </h3>
                    <p className="text-xs text-ink-mute">
                      Scanned transactions and debtor list
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1.5 bg-canvas-soft border border-hairline rounded-lg px-2.5 py-1.5 text-xs text-ink-secondary font-medium shadow-sm">
                      <span className="text-ink-mute font-normal">Sort:</span>
                      <select 
                        value={`${sortField}-${sortDirection}`} 
                        onChange={(e) => {
                          const [field, dir] = e.target.value.split("-");
                          setSortField(field);
                          setSortDirection(dir);
                        }}
                        className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-ink font-semibold p-0 pr-1 text-xs"
                      >
                        <option value="date-desc">Date (Newest)</option>
                        <option value="date-asc">Date (Oldest)</option>
                        <option value="amount-desc">Amount (Highest)</option>
                        <option value="amount-asc">Amount (Lowest)</option>
                        <option value="name-asc">Customer (A-Z)</option>
                        <option value="name-desc">Customer (Z-A)</option>
                        <option value="description-asc">Description (A-Z)</option>
                        <option value="description-desc">Description (Z-A)</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={loadData}
                      className="p-2 rounded-lg border border-hairline hover:bg-canvas-soft text-ink-mute hover:text-ink transition"
                      title="Refresh data"
                    >
                      <RefreshCw className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto flex-grow max-h-[380px]">
                  {loadingData ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-ink-mute">Loading transactions...</span>
                    </div>
                  ) : entries.length > 0 ? (
                    <>
                      {/* Mobile Card List View */}
                      <div className="block md:hidden divide-y divide-hairline">
                        {getSortedEntries().map((entry) => (
                          <div key={entry.id} className="p-4 space-y-3 hover:bg-canvas-soft/30 transition">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-ink text-sm truncate">{entry.name}</h4>
                                <span className="text-[11px] text-ink-mute tnum">{entry.date}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-semibold text-ink text-sm tnum">
                                  ₹{parseFloat(entry.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <p className="text-[11px] text-ink-secondary truncate max-w-[120px]" title={entry.description}>{entry.description || "—"}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-hairline/40">
                              <span className="text-[10px] text-ink-mute uppercase tracking-widest font-semibold">Actions</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setWhatsappModal({ open: true, entry, phone: "" })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold text-[11px] transition cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>Remind</span>
                                </button>
                                <button
                                  onClick={() => setUpiModal({ open: true, entry, upiId: "merchant@upi" })}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>UPI QR</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteLiveEntry(entry.id)}
                                  className="p-1.5 rounded-full hover:bg-ruby/10 text-ruby transition cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <table className="hidden md:table w-full text-sm text-left">
                        <thead className="bg-canvas-soft border-b border-hairline text-ink-mute font-medium text-[11px] uppercase tracking-wider sticky top-0 z-10 select-none">
                          <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-hairline/50 transition duration-150" onClick={() => handleSort("name")}>
                              <div className="flex items-center gap-1.5">
                                Customer
                                {sortField === "name" ? (
                                  sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-hairline/50 transition duration-150" onClick={() => handleSort("date")}>
                              <div className="flex items-center gap-1.5">
                                Date
                                {sortField === "date" ? (
                                  sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-hairline/50 transition duration-150" onClick={() => handleSort("description")}>
                              <div className="flex items-center gap-1.5">
                                Description
                                {sortField === "description" ? (
                                  sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-hairline/50 transition duration-150" onClick={() => handleSort("amount")}>
                              <div className="flex items-center justify-end gap-1.5">
                                Amount
                                {sortField === "amount" ? (
                                  sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {getSortedEntries().map((entry) => (
                            <tr key={entry.id} className="hover:bg-canvas-soft/50 transition">
                              <td className="px-4 py-3.5 font-medium text-ink">
                                {entry.name}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-ink-mute tnum">
                                {entry.date}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-ink-secondary truncate max-w-[150px]" title={entry.description}>
                                {entry.description || "—"}
                              </td>
                              <td className="px-4 py-3.5 font-semibold text-right text-ink tnum">
                                ₹{parseFloat(entry.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* WhatsApp reminder */}
                                  <button
                                    onClick={() => setWhatsappModal({ open: true, entry, phone: "" })}
                                    className="p-1.5 rounded-full hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                                    title="Send WhatsApp Reminder"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </button>
                                  {/* UPI Deep Link QR generator */}
                                  <button
                                    onClick={() => setUpiModal({ open: true, entry, upiId: "merchant@upi" })}
                                    className="p-1.5 rounded-full hover:bg-primary-subdued/30 text-primary hover:text-primary-deep transition cursor-pointer"
                                    title="Generate UPI Payment QR"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </button>
                                  {/* Delete entry */}
                                  <button
                                    onClick={() => handleDeleteLiveEntry(entry.id)}
                                    className="p-1.5 rounded-full hover:bg-ruby/10 text-ruby hover:text-ruby transition cursor-pointer"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-primary-subdued/20 flex items-center justify-center text-primary mb-3">
                        <Database className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-ink">No ledger records found</h4>
                      <p className="text-xs text-ink-mute max-w-[260px] mt-1 mb-4">
                        Upload a photo of your register book to automatically extract entries.
                      </p>
                      <button
                        onClick={() => setActiveTab("scan")}
                        className="inline-flex items-center gap-1 text-xs text-white bg-primary hover:bg-primary-deep px-4 py-2 rounded-pill font-medium transition"
                      >
                        Scan New Page
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- SCANNER & UPLOADER TAB --- */}
        {activeTab === "scan" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            
            {/* Left Column: Image Selector */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white rounded-xl p-6 border border-hairline shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Upload Ledger Photo</h3>
                  <p className="text-xs text-ink-mute">
                    Snap a picture of your register page with clean lighting.
                  </p>
                </div>

                {/* Upload Zone */}
                {!preview ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-hairline-input rounded-xl p-8 text-center bg-canvas-soft/40 hover:bg-canvas-soft transition duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[220px] group relative"
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 rounded-full bg-primary-subdued/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition duration-200">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-ink px-2">
                      <span className="hidden sm:inline">Drag & drop image, or click to browse</span>
                      <span className="inline sm:hidden text-xs">Tap to snap a photo or upload ledger</span>
                    </p>
                    <p className="text-xs text-ink-mute mt-1.5">
                      Supports PNG, JPG, WebP. Up to 10MB.
                    </p>

                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Camera className="w-4.5 h-4.5" />
                      Use Mobile Camera
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden shadow-inner bg-canvas-soft border border-hairline">
                    <img 
                      src={preview} 
                      alt="Ledger Preview" 
                      className="w-full max-h-[360px] object-contain mx-auto"
                    />
                    <button
                      onClick={() => { setFile(null); setPreview(null); setIsExtracted(false); setExtractedEntries([]); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                      title="Remove Image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Submit/Extract Button */}
                {preview && !isExtracted && (
                  <button
                    onClick={triggerExtraction}
                    disabled={isExtracting}
                    className="w-full bg-primary hover:bg-primary-deep text-white font-medium py-3 rounded-pill transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Extracting with Gemini AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                        Extract Ledger Entries
                      </>
                    )}
                  </button>
                )}

                {/* Error Box */}
                {extractionError && (
                  <div className="p-4 bg-ruby/5 border border-ruby/20 rounded-lg flex items-start gap-2.5 text-ruby text-xs">
                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">AI Extraction Failed:</span>
                      <p className="mt-0.5">{extractionError}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: AI Extraction Review and Edit */}
            <div id="review-section" className="lg:col-span-7 space-y-6">
              
              {isExtracting && (
                <div className="bg-white rounded-xl p-8 border border-hairline shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-primary-subdued/30 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-primary animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-ink">Analyzing register entries...</h4>
                    <p className="text-xs text-ink-mute max-w-[280px] mt-1.5 mx-auto">
                      Gemini AI is parsing handwritten names, dates, amounts, and item details.
                    </p>
                  </div>
                </div>
              )}

              {!isExtracting && isExtracted && (
                <div className="bg-white rounded-xl border border-hairline shadow-sm overflow-hidden flex flex-col animate-slideUp">
                  
                  <div className="p-6 border-b border-hairline flex items-center justify-between bg-canvas-soft/30">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">Review AI Extraction</h3>
                      <p className="text-xs text-ink-mute">
                        Double-click or click any cell to edit details before saving.
                      </p>
                    </div>
                    <button
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1 bg-white hover:bg-canvas-soft border border-hairline text-xs font-semibold px-3 py-1.5 rounded-pill shadow-sm text-primary transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[350px]">
                    {/* Mobile Card Edit View */}
                    <div className="block md:hidden divide-y divide-hairline">
                      {extractedEntries.map((entry, idx) => {
                        const isLowConfidence = entry.confidence < 0.70;
                        return (
                          <div 
                            key={idx} 
                            className={`p-4 space-y-3 hover:bg-canvas-soft/30 transition ${
                              isLowConfidence ? "bg-amber-50/40" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-ink-mute uppercase tracking-widest">
                                Entry #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                                  entry.confidence >= 0.85 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : entry.confidence >= 0.70 
                                      ? "bg-amber-50 text-amber-700" 
                                      : "bg-ruby/10 text-ruby"
                                }`}>
                                  {Math.round(entry.confidence * 100)}% Match
                                </span>
                                <button
                                  onClick={() => handleDeleteExtracted(idx)}
                                  className="text-ink-mute hover:text-ruby p-1.5 rounded hover:bg-canvas-soft transition cursor-pointer"
                                  title="Delete Entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-semibold text-ink-mute uppercase tracking-wider mb-1">
                                  Customer Name
                                </label>
                                <input
                                  type="text"
                                  value={entry.name}
                                  onChange={(e) => handleEditEntry(idx, "name", e.target.value)}
                                  className="w-full bg-canvas-soft focus:bg-white border border-hairline focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1.5 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-ink-mute uppercase tracking-wider mb-1">
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={entry.date}
                                  onChange={(e) => handleEditEntry(idx, "date", e.target.value)}
                                  className="w-full bg-canvas-soft focus:bg-white border border-hairline focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1 text-xs tnum"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-ink-mute uppercase tracking-wider mb-1">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  value={entry.amount}
                                  onChange={(e) => handleEditEntry(idx, "amount", e.target.value)}
                                  className="w-full bg-canvas-soft focus:bg-white border border-hairline focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1 text-sm font-semibold tnum"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[10px] font-semibold text-ink-mute uppercase tracking-wider mb-1">
                                  Items / Description
                                </label>
                                <input
                                  type="text"
                                  value={entry.description}
                                  onChange={(e) => handleEditEntry(idx, "description", e.target.value)}
                                  className="w-full bg-canvas-soft focus:bg-white border border-hairline focus:ring-1 focus:ring-primary rounded-lg px-2.5 py-1 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-sm text-left">
                      <thead className="bg-canvas-soft/60 border-b border-hairline text-ink-mute text-[11px] font-medium uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2.5">Customer Name</th>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Items</th>
                          <th className="px-4 py-2.5 text-right w-24">Amount (₹)</th>
                          <th className="px-4 py-2.5 text-center w-24">AI Match</th>
                          <th className="px-4 py-2.5 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {extractedEntries.map((entry, idx) => {
                          const isLowConfidence = entry.confidence < 0.70;
                          return (
                            <tr 
                              key={idx} 
                              className={`hover:bg-canvas-soft/50 transition ${
                                isLowConfidence ? "bg-amber-50/40" : ""
                              }`}
                            >
                              {/* Editable Name */}
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={entry.name}
                                  onChange={(e) => handleEditEntry(idx, "name", e.target.value)}
                                  className="w-full bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded px-1.5 py-1 text-sm font-medium"
                                />
                              </td>
                              {/* Editable Date */}
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={entry.date}
                                  onChange={(e) => handleEditEntry(idx, "date", e.target.value)}
                                  className="w-full bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded px-1 py-1 text-xs tnum"
                                />
                              </td>
                              {/* Editable Description */}
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={entry.description}
                                  onChange={(e) => handleEditEntry(idx, "description", e.target.value)}
                                  className="w-full bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-primary rounded px-1.5 py-1 text-xs"
                                />
                              </td>
                              {/* Editable Amount */}
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={entry.amount}
                                  onChange={(e) => handleEditEntry(idx, "amount", e.target.value)}
                                  className="w-full bg-transparent border-0 text-right focus:bg-white focus:ring-1 focus:ring-primary rounded px-1.5 py-1 text-sm font-semibold tnum"
                                />
                              </td>
                              {/* Confidence score badge */}
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                                  entry.confidence >= 0.85 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : entry.confidence >= 0.70 
                                      ? "bg-amber-50 text-amber-700" 
                                      : "bg-ruby/10 text-ruby"
                                }`}>
                                  {(entry.confidence * 100).toFixed(0)}%
                                </span>
                              </td>
                              {/* Delete row */}
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => handleDeleteExtracted(idx)}
                                  className="text-ink-mute hover:text-ruby p-1 rounded hover:bg-canvas-soft cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {extractedEntries.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm text-ink-mute">No entries to show. Add a row manually or upload another photo.</p>
                    </div>
                  )}

                  {/* Save confirmation Footer */}
                  <div className="p-4 border-t border-hairline bg-canvas-soft/30 flex justify-between items-center">
                    <span className="text-xs text-ink-mute">
                      Confirm these items are correct to write them to your ledger.
                    </span>
                    <button
                      onClick={handleConfirmSave}
                      disabled={extractedEntries.length === 0}
                      className="bg-primary hover:bg-primary-deep text-white font-medium text-sm px-6 py-2.5 rounded-pill transition shadow flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Save to Database
                    </button>
                  </div>

                </div>
              )}

              {!isExtracting && !isExtracted && (
                <div className="bg-white rounded-xl p-8 border border-hairline shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
                  <div className="w-16 h-16 rounded-full bg-canvas-soft flex items-center justify-center text-ink-mute opacity-60 mb-4 border border-dashed border-hairline-input">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-ink">AI Extraction Dashboard</h4>
                  <p className="text-xs text-ink-mute max-w-[280px] mt-1 mx-auto">
                    Select a ledger photo and click "Extract Ledger Entries" to load data here.
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* --- WHATSAPP REMINDER MODAL --- */}
      {whatsappModal.open && whatsappModal.entry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-hairline animate-zoomIn">
            
            <div className="p-6 border-b border-hairline flex items-center justify-between">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                WhatsApp Reminder
              </h3>
              <button 
                onClick={() => setWhatsappModal({ open: false, entry: null, phone: "" })}
                className="text-ink-mute hover:text-ink transition p-1 hover:bg-canvas-soft rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Customer Name
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={whatsappModal.entry.name}
                  className="w-full bg-canvas-soft border border-hairline rounded-lg px-3.5 py-2 text-sm text-ink-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Amount Owed
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={`₹${parseFloat(whatsappModal.entry.amount).toFixed(2)}`}
                  className="w-full bg-canvas-soft border border-hairline rounded-lg px-3.5 py-2 text-sm font-semibold tnum text-ink-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Customer Mobile Phone (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-mute text-sm">
                    +91
                  </div>
                  <input 
                    type="tel" 
                    placeholder="9999988888" 
                    value={whatsappModal.phone}
                    onChange={(e) => setWhatsappModal({ ...whatsappModal, phone: e.target.value })}
                    className="w-full border border-hairline rounded-lg pl-10 pr-3.5 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none focus:border-transparent font-medium"
                  />
                </div>
                <p className="text-[10px] text-ink-mute mt-1">
                  Prefix with country code if outside India. Prefills contact on WhatsApp if added.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1.5">
                  Reminder Message Preview
                </label>
                <div className="bg-canvas-soft border border-hairline rounded-lg p-3 text-xs text-ink-secondary leading-relaxed font-mono">
                  {`Hi ${whatsappModal.entry.name}, this is a reminder from our shop. Outstanding balance of Rs. ${whatsappModal.entry.amount} is due for "${whatsappModal.entry.description}" bought on ${whatsappModal.entry.date}. Please clear it using this UPI link. Thank you!`}
                </div>
              </div>
            </div>

            <div className="p-4 bg-canvas-soft border-t border-hairline flex justify-end gap-3">
              <button
                onClick={() => setWhatsappModal({ open: false, entry: null, phone: "" })}
                className="px-5 py-2.5 border border-hairline rounded-pill text-sm font-medium hover:bg-white transition text-ink-secondary cursor-pointer"
              >
                Cancel
              </button>
              <a
                href={getWhatsAppLink(whatsappModal.entry, whatsappModal.phone)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsappModal({ open: false, entry: null, phone: "" })}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-pill text-sm font-medium shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Send on WhatsApp
                <ChevronRight className="w-4.5 h-4.5" />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* --- UPI PAYMENT MODAL --- */}
      {upiModal.open && upiModal.entry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-hairline animate-zoomIn">
            
            <div className="p-6 border-b border-hairline flex items-center justify-between">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                UPI Payment Request
              </h3>
              <button 
                onClick={() => setUpiModal({ open: false, entry: null, upiId: "merchant@upi" })}
                className="text-ink-mute hover:text-ink transition p-1 hover:bg-canvas-soft rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center space-y-4">
              
              {/* Custom Editable UPI Merchant ID */}
              <div className="w-full text-left">
                <label className="block text-xs font-semibold text-ink-mute uppercase tracking-wider mb-1">
                  Recipient Merchant UPI ID
                </label>
                <input 
                  type="text" 
                  value={upiModal.upiId}
                  onChange={(e) => setUpiModal({ ...upiModal, upiId: e.target.value })}
                  placeholder="e.g. shopname@upi"
                  className="w-full border border-hairline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>

              {/* QR Code container */}
              <div className="bg-canvas-soft p-4 rounded-xl border border-hairline flex flex-col items-center shadow-inner">
                {/* Dynamically call free qr code API */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getUpiUri(upiModal.entry, upiModal.upiId))}`}
                  alt="UPI QR Code"
                  className="w-40 h-40 bg-white p-2 rounded shadow-md border border-hairline"
                />
                <span className="text-[10px] text-ink-mute mt-3 uppercase tracking-wider font-bold">
                  Scan with GPay, PhonePe, Paytm
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">
                  Dues Payment for {upiModal.entry.name}
                </p>
                <p className="text-xl font-bold text-primary tnum">
                  ₹{parseFloat(upiModal.entry.amount).toFixed(2)}
                </p>
                <p className="text-xs text-ink-mute">
                  Item: "{upiModal.entry.description}"
                </p>
              </div>

              {/* UPI Deep link display */}
              <div className="w-full bg-canvas-soft border border-hairline rounded-lg p-2 flex items-center justify-between text-xs font-mono text-ink-secondary">
                <span className="truncate max-w-[280px]">
                  {getUpiUri(upiModal.entry, upiModal.upiId)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getUpiUri(upiModal.entry, upiModal.upiId));
                    showSuccess("UPI Link copied to clipboard!");
                  }}
                  className="p-1.5 hover:bg-white rounded border border-hairline text-ink-mute hover:text-ink transition"
                  title="Copy Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-mute border border-dashed border-hairline p-2.5 rounded-lg w-full justify-center">
                <Smartphone className="w-4 h-4 text-primary" />
                <span>Deep link launches native payment apps on phones.</span>
              </div>

            </div>

            <div className="p-4 bg-canvas-soft border-t border-hairline flex justify-end">
              <button
                onClick={() => setUpiModal({ open: false, entry: null, upiId: "merchant@upi" })}
                className="px-8 py-2.5 bg-primary hover:bg-primary-deep text-white rounded-pill text-sm font-medium shadow transition cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATIONS --- */}
      {successToast && (
        <div className="fixed bottom-4 right-4 bg-ink text-white border border-primary-soft/40 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slideUp">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-medium">{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-4 right-4 bg-white border border-ruby/30 text-ruby px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slideUp">
          <div className="w-5 h-5 rounded-full bg-ruby/10 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5 text-ruby" />
          </div>
          <span className="text-xs font-semibold">{errorToast}</span>
        </div>
      )}

    </div>
  );
}