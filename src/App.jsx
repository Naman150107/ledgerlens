import { useState } from "react";
const DUMMY = [
  { name: "Ramesh Kumar", date: "2026-07-01", description: "Rice 5kg",
    amount: 450, confidence: 0.95 },
  { name: "Sunita Devi", date: "2026-07-02", description: "Oil 1L",
    amount: 220, confidence: 0.62 },
  { name: "Arjun", date: "2026-07-03", description: "Biscuits",
    amount: 80, confidence: 0.88 },
  { name: "Meena Traders", date: "2026-07-04", description: "Atta 10kg",
    amount: 520, confidence: 0.45 },
];
export default function App() {
  const [preview, setPreview] = useState(null);
  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-1">LedgerLens</h1>
      <p className="text-sm text-gray-500 mb-4">Point at paper. Get software.</p>
      <label className="block border-2 border-dashed border-emerald-400
        rounded-xl p-6 text-center cursor-pointer bg-white">
        <span className="text-emerald-700 font-medium">Scan a register page</span>
        <input
          type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) setPreview(URL.createObjectURL(f));
          }}
        />
      </label>
      {preview && (
        <img src={preview} alt="preview"
          className="mt-4 rounded-xl shadow w-full" />
      )}
      <h2 className="mt-6 mb-2 font-semibold text-gray-700">
        Extracted entries (demo data)
      </h2>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Item</th>
              <th className="p-2">Rs</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY.map((e, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{e.name}</td>
                <td className="p-2">{e.description}</td>
                <td className={"p-2 font-medium " + (e.confidence < 0.7
                  ? "bg-yellow-100 outline outline-yellow-400 rounded" : "")}>
                  {e.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Yellow = AI is unsure - tap to review (coming later)
      </p>
      <button disabled className="mt-4 w-full bg-emerald-600 text-white
        rounded-xl py-3 font-semibold opacity-50">
        Confirm &amp; Save
      </button>
    </div>
  );
}