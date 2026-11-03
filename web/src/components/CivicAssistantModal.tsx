import React, { useState } from 'react';
import { X, Send, Bot, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { ragApi } from '../services/api';
import { RAGSource } from '../types';

interface CivicAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  contextTitle?: string;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  sources?: RAGSource[];
  isFallback?: boolean;
  latencyMs?: number;
  useRag?: boolean;
}

export const CivicAssistantModal: React.FC<CivicAssistantModalProps> = ({
  isOpen,
  onClose,
  reportId,
  contextTitle
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: reportId
        ? `Hello! I am your RAG Civic Assistant. I am linked to report #${reportId}. Ask me about standard operating procedures, SLAs, or next steps.`
        : 'Hello! I am your verified Civic Assistant. Ask me anything regarding municipal guidelines, department responsibilities, or complaint procedures.'
    }
  ]);

  React.useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          sender: 'assistant',
          text: reportId
            ? `Hello! I am your RAG Civic Assistant. I am linked to report #${reportId}. Ask me about standard operating procedures, SLAs, or next steps.`
            : 'Hello! I am your verified Civic Assistant. Ask me anything regarding municipal guidelines, department responsibilities, or complaint procedures.'
        }
      ]);
    }
  }, [reportId, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (customQuery?: string) => {
    const q = customQuery || question;
    if (!q.trim() || loading) return;

    const userMsg: Message = { sender: 'user', text: q, useRag };
    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setQuestion('');
    setLoading(true);

    try {
      const res = await ragApi.query(q, reportId, useRag);
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.data.answer,
        sources: res.data.sources,
        isFallback: res.data.isFallback,
        latencyMs: res.data.latencyMs,
        useRag
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to reach the Civic Knowledge Base service. Please ensure the backend and AI services are running.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-2xl h-[650px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-[#0d1322] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">RAG Civic Assistant</h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  Verified Grounded AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {contextTitle ? `Context: ${contextTitle}` : reportId ? `Linked to Issue #${reportId}` : 'Grounded in verified municipal SOPs and regulations'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Academic Evaluation Mode Toggle */}
            <button
              type="button"
              onClick={() => setUseRag(!useRag)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                useRag
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
              title="Toggle between Grounded RAG Retrieval mode and Direct LLM Baseline"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${useRag ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{useRag ? 'RAG Grounded' : 'Baseline LLM'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Suggested Inquiries */}
        <div className="bg-slate-50/50 dark:bg-[#0a0f1d] px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-slate-400 shrink-0 font-medium">Suggestions:</span>
          <button
            onClick={() => handleSend('What happens next to this complaint?')}
            className="bg-white dark:bg-[#1a233a] hover:bg-slate-100 dark:hover:bg-[#232f4e] px-3 py-1 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700 transition"
          >
            What happens next?
          </button>
          <button
            onClick={() => handleSend('What is the repair timeline SLA for potholes?')}
            className="bg-white dark:bg-[#1a233a] hover:bg-slate-100 dark:hover:bg-[#232f4e] px-3 py-1 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700 transition"
          >
            Pothole repair SLA
          </button>
          <button
            onClick={() => handleSend('What is the official procedure for recurring garbage dump sites?')}
            className="bg-white dark:bg-[#1a233a] hover:bg-slate-100 dark:hover:bg-[#232f4e] px-3 py-1 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700 transition"
          >
            Recurring garbage SOP
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Grounded Source Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Verified Citations (FAISS Similarity):</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {msg.sources.map((s, sIdx) => (
                        <li key={sIdx} className="bg-white dark:bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.documentName}</span>
                            <span className="text-slate-400 text-[11px] truncate">{s.pageOrSection}</span>
                          </div>
                          {s.relevanceScore !== undefined && (
                            <span className="shrink-0 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                              {Math.round(s.relevanceScore * 100)}% Match
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Telemetry Footer */}
                {msg.sender === 'assistant' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 font-mono">
                    <span>{msg.useRag ? 'Mode: Grounded RAG' : 'Mode: Baseline LLM'}</span>
                    {msg.latencyMs !== undefined && (
                      <>
                        <span>•</span>
                        <span>Latency: {msg.latencyMs}ms</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-4 flex items-center space-x-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Searching verified civic knowledge base &amp; synthesizing answer...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="bg-slate-50 dark:bg-[#0d1322] p-4 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about municipal procedures, timelines, or regulations..."
              className="flex-1 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition flex items-center justify-center shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
