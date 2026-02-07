import { useState } from "react"
import axios from "axios"
import { useQuery, useMutation } from "@tanstack/react-query"

const UpdateConfig = () => {
  const [editedConfig, setEditConfig] = useState({
    Id: "123",
    Endpoint: "",
    Key: ""
  })
  const [isEditing, setIsEditing] = useState(false)

  const fetchReverseConfig = async () => {
    const resp = await axios.get(`http://localhost:3000/reverse-http/list`, {
      withCredentials: true
    })
    return resp.data
  }

  const { data, isError, isLoading } = useQuery({
    queryKey: ["get", "list"],
    queryFn: fetchReverseConfig,
  })

  const updateConfig = async () => {
    const request = await axios.post(
      `http://localhost:3000/reverse-http/edit`,
      editedConfig,
      { withCredentials: true }
    )
    return request.data
  }

  const { mutate } = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      console.log("successfully changed the config")
      setIsEditing(false)
    },
    onError: () => {
      console.log("failed to change the config")
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-xl text-gray-300 font-semibold">Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="bg-[#1a1a1a] border border-red-500/50 rounded-2xl p-8 max-w-md">
          <div className="text-red-400 text-6xl mb-4 text-center">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">Error Loading Data</h2>
          <p className="text-gray-400 text-center">Failed to fetch configuration from the API</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Configuration Manager
          </h1>
          <p className="text-gray-400 text-lg">Update and manage your reverse HTTP configurations</p>
        </div>

        {/* Config List */}
        <div className="grid gap-6 mb-8">
          {data?.data.map((item: any) => (
            <div
              key={item.Id}
              className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">ID</span>
                    <span className="text-white font-mono text-lg bg-[#0a0a0a] px-4 py-1 rounded-lg">
                      {item.Id}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider min-w-[80px]">
                        Endpoint
                      </span>
                      <span className="text-gray-300 font-mono text-sm bg-[#0a0a0a] px-3 py-1 rounded">
                        {item.Endpoint || "Not set"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider min-w-[80px]">
                        Key
                      </span>
                      <span className="text-gray-300 font-mono text-sm bg-[#0a0a0a] px-3 py-1 rounded">
                        {item.Key || "Not set"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditConfig({
                      Id: item.Id,
                      Key: item.Key,
                      Endpoint: item.Endpoint,
                    })
                    setIsEditing(true)
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-3xl p-8 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">
                  Edit Configuration
                </h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-white text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* ID Display */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-2 text-sm uppercase tracking-wider">
                    Configuration ID
                  </label>
                  <div className="bg-[#0a0a0a] text-gray-300 font-mono px-4 py-3 rounded-xl border border-gray-700">
                    {editedConfig.Id.slice(0, 10)}...
                  </div>
                </div>

                {/* Key Input */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-2 text-sm uppercase tracking-wider">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={editedConfig.Key}
                    onChange={(e) =>
                      setEditConfig({
                        ...editedConfig,
                        Key: e.target.value
                      })
                    }
                    className="w-full bg-[#0a0a0a] text-white font-mono px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="Enter API key..."
                  />
                </div>

                {/* Endpoint Input */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-2 text-sm uppercase tracking-wider">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={editedConfig.Endpoint}
                    onChange={(e) =>
                      setEditConfig({
                        ...editedConfig,
                        Endpoint: e.target.value
                      })
                    }
                    className="w-full bg-[#0a0a0a] text-white font-mono px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => mutate()}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all duration-200"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-[#0a0a0a] hover:bg-gray-800 text-gray-300 font-semibold py-4 rounded-xl transition-all duration-200 border border-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpdateConfig
