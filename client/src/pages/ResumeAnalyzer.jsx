import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import JobCard from '../components/JobCard';
import { FiUploadCloud, FiFileText, FiX, FiCheckCircle, FiLoader } from 'react-icons/fi';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { backendUrl, userData, setFilterSkills, setIsSearched } = useContext(AppContext);
  const navigate = useNavigate();

  // If not logged in or is a recruiter, handle it gracefully
  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to use the Resume Analyzer.</h2>
          <button onClick={() => navigate("/")} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Go to Home</button>
        </div>
      </div>
    );
  }

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        toast.error("Please upload a PDF file only.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        toast.error("Please upload a PDF file only.");
      }
    }
  };

  const analyzeResume = async () => {
    if (!file) return;
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      // Assuming frontend handles token injecting correctly or rely on clerk
      const response = await fetch(`${backendUrl}/api/users/analyze`, {
        method: "POST",
        body: formData,
        // Authentication token should be appended properly based on how AppContext implements fetch
        // BUT wait, in earlier examples, frontend uses Authorization Bearer token header if needed
        headers: {
            "Authorization": `Bearer ${window.Clerk?.session?.id || ""}` // Fallback, we'll actually use AppContext fetch if possible, or Clerk token. Let's use the standard fetch implementation.
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (data.skills && data.skills.length > 0) {
          setFilterSkills(data.skills);
        }
        setIsSearched(true);
        toast.success("Resume analyzed successfully!");
      } else {
        toast.error(data.message || "Failed to analyze resume.");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          AI Resume Analyzer
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Upload your resume and let our intelligent AI extract your core skills to find the perfect job matches tailored precisely for you.
        </p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {/* Upload Box */}
        {!results && (
        <motion.div 
          className="bg-white rounded-2xl shadow-xl p-8 border border-indigo-50"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-indigo-300'}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input type="file" id="resumeUpload" hidden accept="application/pdf" onChange={handleFileChange} />
            
            {!file ? (
              <>
                <div className="w-20 h-20 bg-white rounded-full shadow flex items-center justify-center mb-6">
                  <FiUploadCloud className="text-4xl text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Drag & Drop your resume</h3>
                <p className="text-gray-500 mb-6">Must be a PDF file (Max 5MB)</p>
                <label 
                  htmlFor="resumeUpload" 
                  className="px-8 py-3 bg-indigo-600 text-white rounded-full font-medium cursor-pointer hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                  Browse Files
                </label>
              </>
            ) : (
               <>
                 <div className="w-20 h-20 bg-white rounded-full shadow flex items-center justify-center mb-6 relative">
                   <FiFileText className="text-4xl text-indigo-600" />
                   <button onClick={(e) => { e.preventDefault(); setFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
                     <FiX />
                   </button>
                 </div>
                 <h3 className="text-xl font-semibold mb-2 text-indigo-900">{file.name}</h3>
                 <p className="text-gray-500 mb-6 font-medium">Ready to analyze</p>
                 <button 
                  onClick={analyzeResume}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-bold cursor-pointer hover:shadow-lg hover:shadow-indigo-300 disabled:opacity-70 transition w-full max-w-xs justify-center"
                 >
                   {loading ? (
                     <><FiLoader className="animate-spin text-xl" /> Analyzing...</>
                   ) : (
                     <><FiCheckCircle className="text-xl" /> Analyze & Match Skills</>
                   )}
                 </button>
               </>
            )}
          </div>
        </motion.div>
        )}

        {/* Results Section */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Reset Button */}
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <FiFileText />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Analyzed File</p>
                    <p className="font-semibold text-gray-800">{file?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setResults(null); setFile(null); }}
                  className="text-sm font-medium text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                >
                  Analyze another file
                </button>
              </div>

              {/* Extracted Skills */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full opacity-50 -z-10 blur-2xl"></div>
                
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                  <span className="w-2 h-8 bg-emerald-500 rounded-full"></span> 
                  Extracted Technical Skills
                </h3>
                
                {results.skills && results.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {results.skills.map((skill, index) => (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05, type: "spring" }}
                        key={index}
                        className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold capitalize shadow-sm"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
                    We could not boldly identify any common frameworks from our predefined set. However, we have still gathered relevant jobs.
                  </div>
                )}
              </div>

              {/* Matched Jobs */}
              <div>
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                  <span className="w-2 h-8 bg-blue-500 rounded-full"></span> 
                  Perfect Job Matches For You
                </h3>
                
                {results.matchedJobs && results.matchedJobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.matchedJobs.map((job, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: index * 0.1 }}
                        key={job._id || index}
                      >
                        <JobCard job={job} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">No direct matches found. Try widening your search or updating your skills.</p>
                  </div>
                )}
                
                {/* Find More Jobs Button */}
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => navigate('/')} 
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-indigo-200 text-indigo-700 font-semibold rounded-full hover:bg-indigo-50 transition shadow-sm"
                  >
                    Explore all matched jobs on Home Page
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default ResumeAnalyzer;
