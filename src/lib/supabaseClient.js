import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = () => {
  const url = supabaseUrl.trim();
  const key = supabaseAnonKey.trim();
  return (
    url !== "" && 
    url.startsWith("http") && 
    !url.includes("your_supabase_url_here") &&
    key !== "" &&
    !key.includes("your_supabase_anon_key_here")
  );
};

// Initialize Supabase if variables are present
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial dummy database data to showcase the metrics dashboard immediately
const INITIAL_DEMO_ENTRIES = [
  { id: "d1", name: "Ramesh Kumar", date: "2026-07-01", description: "Rice 5kg, Sugar 2kg", amount: 650, confidence: 0.95, created_at: new Date("2026-07-01T10:00:00Z").toISOString() },
  { id: "d2", name: "Sunita Devi", date: "2026-07-02", description: "Mustard Oil 1L, Soap", amount: 260, confidence: 0.88, created_at: new Date("2026-07-02T11:30:00Z").toISOString() },
  { id: "d3", name: "Arjun Singh", date: "2026-07-03", description: "Tea Powder, Biscuits", amount: 150, confidence: 0.62, created_at: new Date("2026-07-03T09:15:00Z").toISOString() },
  { id: "d4", name: "Meena Traders", date: "2026-07-04", description: "Wheat Flour 10kg", amount: 480, confidence: 0.92, created_at: new Date("2026-07-04T15:45:00Z").toISOString() },
  { id: "d5", name: "Ramesh Kumar", date: "2026-07-05", description: "Lentils 2kg, Ghee 1L", amount: 820, confidence: 0.91, created_at: new Date("2026-07-05T08:20:00Z").toISOString() },
  { id: "d6", name: "Sunita Devi", date: "2026-07-06", description: "Washing powder, Sponges", amount: 310, confidence: 0.54, created_at: new Date("2026-07-06T14:10:00Z").toISOString() },
  { id: "d7", name: "Vikram Rathore", date: "2026-07-07", description: "Dry Fruits Mix", amount: 1250, confidence: 0.89, created_at: new Date("2026-07-07T12:00:00Z").toISOString() }
];

// Helper to initialize localStorage
const getLocalEntries = () => {
  const localData = localStorage.getItem("ledgerlens_entries");
  if (!localData) {
    localStorage.setItem("ledgerlens_entries", JSON.stringify(INITIAL_DEMO_ENTRIES));
    return INITIAL_DEMO_ENTRIES;
  }
  return JSON.parse(localData);
};

// Save a list of entries (creates individual records)
export const saveEntries = async (entries) => {
  const formattedEntries = entries.map(entry => ({
    name: entry.name || "Unknown Customer",
    date: entry.date || new Date().toISOString().split("T")[0],
    description: entry.description || "General Purchase",
    amount: parseFloat(entry.amount) || 0,
    confidence: parseFloat(entry.confidence) || 1.0,
  }));

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("ledger_entries")
        .insert(formattedEntries)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error("Supabase Save Error, falling back to LocalStorage:", err);
      // Fall through to localStorage on error
    }
  }

  // Local Storage Fallback
  const currentLocal = getLocalEntries();
  const newEntries = formattedEntries.map((e, idx) => ({
    id: `local-${Date.now()}-${idx}`,
    created_at: new Date().toISOString(),
    ...e
  }));
  
  const updated = [...newEntries, ...currentLocal];
  localStorage.setItem("ledgerlens_entries", JSON.stringify(updated));
  return { success: true, data: newEntries, isFallback: true };
};

// Fetch all entries
export const fetchEntries = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("ledger_entries")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error("Supabase Fetch Error, falling back to LocalStorage:", err);
      // Fall through to localStorage on error
    }
  }

  // Local Storage Fallback
  const data = getLocalEntries();
  // Sort by date desc, then by created_at desc
  const sorted = [...data].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  return { success: true, data: sorted, isFallback: true };
};

// Delete an entry
export const deleteEntry = async (id) => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("ledger_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Supabase Delete Error, falling back to LocalStorage:", err);
    }
  }

  // Local Storage Fallback
  const currentLocal = getLocalEntries();
  const updated = currentLocal.filter(entry => entry.id !== id);
  localStorage.setItem("ledgerlens_entries", JSON.stringify(updated));
  return { success: true, isFallback: true };
};
