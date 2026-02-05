import { useState, FormEvent } from "react";

interface ReverseHttpReq {
  name: string;
  endpoint: string;
}

const AddRoute = () => {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const payload: ReverseHttpReq = { name, endpoint };

    try {
      const res = await fetch("http://localhost:3000/reverse-http/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // cookies true
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create route");

      setMsg(`✅ Route created successfully: ${data.route_id || ""}`);
      setName("");
      setEndpoint("");
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        className="bg-gray-900 p-8 rounded-xl w-96 shadow-lg"
        onSubmit={handleSubmit}
      >
        <h1 className="text-white text-2xl font-bold mb-6 text-center">
          Add Reverse Route
        </h1>

        <input
          type="text"
          placeholder="Route Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        />

        <input
          type="text"
          placeholder="Private Endpoint (http://192.168.x.x)"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Route"}
        </button>

        {msg && (
          <p className="mt-4 text-center text-gray-300 break-words">{msg}</p>
        )}
      </form>
    </div>
  );
};

export default AddRoute;
