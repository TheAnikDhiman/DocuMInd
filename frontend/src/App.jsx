import { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    if (!file) return alert("Choose a PDF first");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      await axios.post(
        "http://127.0.0.1:8000/documents/upload",
        formData
      );

      alert("Document uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question) return;

    try {
      setLoading(true);

      const res = await axios.post(
        "http://127.0.0.1:8000/chat/",
        {
          question,
        }
      );

      setAnswer(res.data.answer);
    } catch (err) {
      console.error(err);
      alert("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-10">

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-4xl font-bold mb-6">
          📄 DocuMind
        </h1>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />

        <br />

        <button
          onClick={uploadFile}
          className="bg-blue-600 text-white px-5 py-2 rounded"
        >
          Upload PDF
        </button>

        <hr className="my-8" />

        <textarea
          placeholder="Ask anything..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full border p-3 rounded"
          rows={4}
        />

        <button
          onClick={askQuestion}
          className="mt-4 bg-green-600 text-white px-5 py-2 rounded"
        >
          Ask AI
        </button>

        {loading && (
          <p className="mt-5">Loading...</p>
        )}

        {answer && (
          <div className="mt-6 bg-gray-100 p-5 rounded">
            <h2 className="font-bold mb-2">
              Answer
            </h2>

            <p>{answer}</p>
          </div>
        )}

      </div>

    </div>
  );
}

export default App;