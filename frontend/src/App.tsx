import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type FeedbackEvent = {
  id: number;
  student_id: string;
  action: string;
  timestamp: string;
  lesson_id?: number | null;
  lesson_title?: string | null;
};

type Summary = {
  understand: number;
  slow_down: number;
  help: number;
  total: number;
};

type MoodData = {
  mood: string;
  message: string;
  counts: Summary;
  percentages: {
    understand: number;
    slow_down: number;
    help: number;
  };
  window_minutes: number;
};

type GraphPoint = {
  time: string;
  understand: number;
  slow_down: number;
  help: number;
};

type NotificationState = {
  visible: boolean;
  message: string;
};

type Lesson = {
  id: number;
  title: string;
  start_time: string;
  end_time: string | null;
  status: string;
};

type LessonPhase = {
  phase: string;
  label: string;
  summary: Summary;
  percentages: {
    understand: number;
    slow_down: number;
    help: number;
  };
  interpretation: string;
};

type LessonReport = {
  lesson: Lesson | null;
  summary: Summary;
  percentages: {
    understand: number;
    slow_down: number;
    help: number;
  };
  phases: LessonPhase[];
  graph: GraphPoint[];
  events: FeedbackEvent[];
  duration: {
    start_time: string;
    end_time: string;
    duration_minutes: number;
  };
  report: {
    title: string;
    overview: string;
    insights: string[];
    recommendation: string;
  };
};

const API_BASE_URL = "http://localhost:8000";

function App() {
  const [events, setEvents] = useState<FeedbackEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [graphData, setGraphData] = useState<GraphPoint[]>([]);
  const [showGraph, setShowGraph] = useState(true);

  const [students, setStudents] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [studentSummary, setStudentSummary] = useState<Summary | null>(null);
  const [studentEvents, setStudentEvents] = useState<FeedbackEvent[]>([]);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonMessage, setLessonMessage] = useState("");
  const [lessonBusy, setLessonBusy] = useState(false);

  const [selectedLessonReport, setSelectedLessonReport] =
    useState<LessonReport | null>(null);
  const [lessonReportOpen, setLessonReportOpen] = useState(false);
  const [lessonReportLoading, setLessonReportLoading] = useState(false);

  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    message: "",
  });

  const [graphWindowValue, setGraphWindowValue] = useState("30");
  const [graphWindowUnit, setGraphWindowUnit] = useState("minutes");
  const [graphGroupBy, setGraphGroupBy] = useState("5min");

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  const latestSeenEventId = useRef<number | null>(null);
  const notificationTimer = useRef<number | null>(null);

  const isCompact = viewportWidth < 980;
  const isVeryCompact = viewportWidth < 650;

  const showHelpNotification = (studentId: string) => {
    setNotification({
      visible: true,
      message: `New help request from ${studentId}`,
    });

    if (notificationTimer.current) {
      window.clearTimeout(notificationTimer.current);
    }

    notificationTimer.current = window.setTimeout(() => {
      setNotification({
        visible: false,
        message: "",
      });
    }, 5000);
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/events/recent`);
      const data = await res.json();
      const newEvents: FeedbackEvent[] = data.events;
      setEvents(newEvents);

      if (newEvents.length > 0) {
        const newestEvent = newEvents[0];

        if (latestSeenEventId.current === null) {
          latestSeenEventId.current = newestEvent.id;
        } else if (newestEvent.id > latestSeenEventId.current) {
          const unseenEvents = newEvents.filter(
            (event) => event.id > (latestSeenEventId.current ?? 0)
          );

          const newestHelpEvent = unseenEvents.find(
            (event) => event.action === "help"
          );

          if (newestHelpEvent) {
            showHelpNotification(newestHelpEvent.student_id);
          }

          latestSeenEventId.current = newestEvent.id;
        }
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/summary`);
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  const fetchMood = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/mood`);
      const data = await res.json();
      setMoodData(data.data);
    } catch (err) {
      console.error("Error fetching mood:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/students`);
      const data = await res.json();
      setStudents(data.students);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  const fetchActiveLesson = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/lessons/active`);
      const data = await res.json();
      setActiveLesson(data.lesson);
    } catch (err) {
      console.error("Error fetching active lesson:", err);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/lessons?limit=8`);
      const data = await res.json();
      setLessons(data.lessons);
    } catch (err) {
      console.error("Error fetching lessons:", err);
    }
  };

  const fetchLessonReport = async (lessonId: number) => {
    try {
      setLessonReportLoading(true);
      setLessonReportOpen(true);

      const res = await fetch(`${API_BASE_URL}/lessons/${lessonId}/report`);
      const data = await res.json();

      setSelectedLessonReport(data.data);
    } catch (err) {
      console.error("Error fetching lesson report:", err);
    } finally {
      setLessonReportLoading(false);
    }
  };

  const handleStartLesson = async () => {
    const trimmedTitle = lessonTitle.trim();

    if (!trimmedTitle) {
      setLessonMessage("Please enter a lesson title first.");
      return;
    }

    try {
      setLessonBusy(true);
      setLessonMessage("");

      const res = await fetch(`${API_BASE_URL}/lessons/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setActiveLesson(data.lesson);
        setLessonTitle("");
        setLessonMessage("Lesson started successfully.");
        await fetchLessons();
      } else {
        setLessonMessage("Could not start lesson.");
      }
    } catch (err) {
      console.error("Error starting lesson:", err);
      setLessonMessage("Error starting lesson.");
    } finally {
      setLessonBusy(false);
    }
  };

  const handleEndLesson = async () => {
    try {
      setLessonBusy(true);
      setLessonMessage("");

      const res = await fetch(`${API_BASE_URL}/lessons/end`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.status === "success") {
        setActiveLesson(null);
        setLessonMessage("Lesson ended successfully.");
        await fetchLessons();
      } else {
        setLessonMessage("No active lesson to end.");
      }
    } catch (err) {
      console.error("Error ending lesson:", err);
      setLessonMessage("Error ending lesson.");
    } finally {
      setLessonBusy(false);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    if (studentId === "all") {
      setStudentSummary(null);
      setStudentEvents([]);
      return;
    }

    try {
      const [summaryRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/summary`),
        fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/events`),
      ]);

      const summaryData = await summaryRes.json();
      const eventsData = await eventsRes.json();

      setStudentSummary(summaryData.summary);
      setStudentEvents(eventsData.events);
    } catch (err) {
      console.error("Error fetching student data:", err);
    }
  };

  const fetchGraph = async () => {
    try {
      const params = new URLSearchParams({
        window_value: graphWindowValue,
        window_unit: graphWindowUnit,
        group_by: graphGroupBy,
      });

      const endpoint =
        selectedStudent === "all"
          ? `${API_BASE_URL}/graphs?${params.toString()}`
          : `${API_BASE_URL}/students/${encodeURIComponent(
            selectedStudent
          )}/graph?${params.toString()}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      setGraphData(data.data);
    } catch (err) {
      console.error("Error fetching graph data:", err);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchSummary();
    fetchMood();
    fetchStudents();
    fetchActiveLesson();
    fetchLessons();

    const interval = setInterval(() => {
      fetchEvents();
      fetchSummary();
      fetchMood();
      fetchStudents();
      fetchActiveLesson();
      fetchLessons();

      if (selectedStudent !== "all") {
        fetchStudentData(selectedStudent);
      }

      if (showGraph) {
        fetchGraph();
      }
    }, 3000);

    return () => {
      clearInterval(interval);

      if (notificationTimer.current) {
        window.clearTimeout(notificationTimer.current);
      }
    };
  }, [
    showGraph,
    selectedStudent,
    graphWindowValue,
    graphWindowUnit,
    graphGroupBy,
  ]);

  useEffect(() => {
    fetchStudentData(selectedStudent);

    if (showGraph) {
      fetchGraph();
    }
  }, [selectedStudent]);

  const pieData = moodData
    ? [
      { name: "Understand", value: moodData.percentages.understand },
      { name: "Slow Down", value: moodData.percentages.slow_down },
      { name: "Need Help", value: moodData.percentages.help },
    ]
    : [];

  const hasPieData = pieData.some((item) => Number(item.value) > 0);
  const hasGraphData = graphData.length > 0;

  const PIE_COLORS = ["#16a34a", "#eab308", "#dc2626"];

  const getMoodBadge = (mood: string) => {
    if (
      mood.includes("understanding") &&
      !mood.includes("slow") &&
      !mood.includes("help")
    ) {
      return {
        text: "Class is comfortable",
        background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
        color: "#166534",
        border: "#86efac",
        emoji: "✅",
      };
    }

    if (mood.includes("help")) {
      return {
        text: "Help needed",
        background: "linear-gradient(135deg, #fee2e2, #fecaca)",
        color: "#991b1b",
        border: "#fca5a5",
        emoji: "🚨",
      };
    }

    if (mood.includes("slow")) {
      return {
        text: "Slow down",
        background: "linear-gradient(135deg, #fef9c3, #fde68a)",
        color: "#854d0e",
        border: "#facc15",
        emoji: "⚠️",
      };
    }

    if (mood === "no_data") {
      return {
        text: "Waiting for feedback",
        background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
        color: "#374151",
        border: "#d1d5db",
        emoji: "⏳",
      };
    }

    return {
      text: "Mixed feedback",
      background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
      color: "#075985",
      border: "#7dd3fc",
      emoji: "📊",
    };
  };

  const formatActionLabel = (action: string) => {
    if (action === "understand") return "Understands";
    if (action === "slow_down") return "Slow down";
    if (action === "help") return "Needs help";
    return action;
  };

  const getActionStyle = (action: string) => {
    if (action === "understand") {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "#86efac",
      };
    }

    if (action === "slow_down") {
      return {
        background: "#fef9c3",
        color: "#854d0e",
        border: "#facc15",
      };
    }

    if (action === "help") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "#fca5a5",
      };
    }

    return {
      background: "#f3f4f6",
      color: "#374151",
      border: "#d1d5db",
    };
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "Not ended";

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatShortTime = (timestamp: string | null) => {
    if (!timestamp) return "Not ended";

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPercentage = (value: unknown) => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return "0%";
    }

    return `${numericValue.toFixed(1)}%`;
  };

  const moodBadge = moodData ? getMoodBadge(moodData.mood) : null;

  const graphTitle =
    selectedStudent === "all" ? "Whole class trend" : `${selectedStudent} trend`;

  const displayedEvents =
    selectedStudent === "all" ? events : studentEvents.length > 0 ? studentEvents : [];

  const classPanelColumns = isCompact ? "1fr" : "1.05fr 0.95fr";
  const lowerPanelColumns = isCompact ? "1fr" : "0.82fr 1.18fr";
  const summaryColumns = isVeryCompact
    ? "1fr"
    : "repeat(auto-fit, minmax(190px, 1fr))";
  const graphControlColumns = isVeryCompact
    ? "1fr"
    : isCompact
      ? "1fr 1fr"
      : "1fr 1fr 1fr auto";

  const pageStyle: React.CSSProperties = {
    position: "relative",
    left: "50%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",
    width: "100vw",
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: isVeryCompact ? "16px" : "26px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background:
      "radial-gradient(circle at 5% 5%, rgba(37, 99, 235, 0.18), transparent 28%), radial-gradient(circle at 90% 8%, rgba(34, 197, 94, 0.16), transparent 32%), linear-gradient(135deg, #eef2ff 0%, #f8fafc 44%, #f1f5f9 100%)",
    color: "#0f172a",
    textAlign: "left",
  };

  const shellStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "calc(100vh - 52px)",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "26px",
    padding: isVeryCompact ? "17px" : "22px",
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
    backdropFilter: "blur(16px)",
    boxSizing: "border-box",
    minWidth: 0,
    animation: "fadeSlideUp 0.55s ease both",
  };

  const softCardStyle: React.CSSProperties = {
    ...cardStyle,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "44px",
    padding: "11px 13px",
    borderRadius: "15px",
    border: "1px solid rgba(148, 163, 184, 0.42)",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 700,
    outline: "none",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    minHeight: "44px",
    padding: "10px 16px",
    cursor: "pointer",
    borderRadius: "15px",
    border: "1px solid rgba(15, 23, 42, 0.12)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.97))",
    color: "#0f172a",
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.28)",
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    border: "none",
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    color: "#ffffff",
    boxShadow: "0 14px 26px rgba(220, 38, 38, 0.23)",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    borderRadius: "15px",
    border: "1px solid rgba(148, 163, 184, 0.42)",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 700,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "7px",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "clamp(19px, 1.6vw, 25px)",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  };

  const mutedTextStyle: React.CSSProperties = {
    color: "#64748b",
    margin: 0,
    lineHeight: 1.5,
  };

  const renderMetricCard = (
    label: string,
    value: number | string,
    helper: string,
    background: string,
    color: string,
    emoji: string
  ) => (
    <div
      style={{
        minHeight: "124px",
        borderRadius: "24px",
        padding: "18px",
        background,
        color,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 14px 26px rgba(15, 23, 42, 0.08)",
        border: "1px solid rgba(255,255,255,0.62)",
        animation: "softPop 0.45s ease both",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 900, opacity: 0.9 }}>
          {label}
        </div>
        <div style={{ fontSize: "22px" }}>{emoji}</div>
      </div>

      <div style={{ fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 950 }}>
        {value}
      </div>

      <div style={{ fontSize: "12px", fontWeight: 800, opacity: 0.78 }}>
        {helper}
      </div>
    </div>
  );

  const renderMiniSummary = (title: string, data: Summary | null) => {
    if (!data) {
      return (
        <div style={{ ...softCardStyle, minHeight: "150px" }}>
          <h3 style={{ marginTop: 0 }}>{title}</h3>
          <p style={mutedTextStyle}>Select a student to see individual feedback.</p>
        </div>
      );
    }

    return (
      <div style={{ ...softCardStyle, minHeight: "150px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "14px" }}>{title}</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isVeryCompact
              ? "1fr 1fr"
              : "repeat(4, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          {[
            ["Understands", data.understand, "#dcfce7", "#166534"],
            ["Slow", data.slow_down, "#fef9c3", "#854d0e"],
            ["Help", data.help, "#fee2e2", "#991b1b"],
            ["Total", data.total, "#e2e8f0", "#0f172a"],
          ].map(([label, value, background, color]) => (
            <div
              key={label}
              style={{
                padding: "12px",
                borderRadius: "17px",
                background: background as string,
                color: color as string,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 900 }}>{label}</div>
              <div style={{ fontSize: "25px", fontWeight: 950 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLessonModal = () => {
    if (!lessonReportOpen) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(15, 23, 42, 0.58)",
          backdropFilter: "blur(8px)",
          display: "grid",
          placeItems: "center",
          padding: isVeryCompact ? "12px" : "28px",
          animation: "fadeIn 0.2s ease both",
        }}
      >
        <div
          style={{
            width: "min(1180px, 100%)",
            maxHeight: "92vh",
            overflowY: "auto",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
            borderRadius: "30px",
            border: "1px solid rgba(226,232,240,0.9)",
            boxShadow: "0 30px 80px rgba(15, 23, 42, 0.35)",
            padding: isVeryCompact ? "18px" : "26px",
            animation: "modalRise 0.32s ease both",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-start",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p style={labelStyle}>Lesson report</p>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 3vw, 40px)",
                  letterSpacing: "-0.04em",
                }}
              >
                {lessonReportLoading
                  ? "Loading report..."
                  : selectedLessonReport?.report.title ?? "Lesson report"}
              </h2>

              {selectedLessonReport?.lesson && (
                <p style={{ ...mutedTextStyle, marginTop: "8px" }}>
                  {formatTimestamp(selectedLessonReport.lesson.start_time)} →{" "}
                  {formatTimestamp(selectedLessonReport.lesson.end_time)}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setLessonReportOpen(false);
                setSelectedLessonReport(null);
              }}
              style={{
                ...buttonStyle,
                background: "#f8fafc",
              }}
            >
              Close
            </button>
          </div>

          {lessonReportLoading ? (
            <div
              style={{
                minHeight: "320px",
                display: "grid",
                placeItems: "center",
                color: "#64748b",
                fontWeight: 900,
              }}
            >
              Building lesson report...
            </div>
          ) : selectedLessonReport ? (
            <div style={{ display: "grid", gap: "18px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr 1fr",
                  gap: "14px",
                }}
              >
                {renderMetricCard(
                  "Understood",
                  selectedLessonReport.summary.understand,
                  `${selectedLessonReport.percentages.understand}% of feedback`,
                  "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                  "#166534",
                  "✅"
                )}

                {renderMetricCard(
                  "Slow down",
                  selectedLessonReport.summary.slow_down,
                  `${selectedLessonReport.percentages.slow_down}% of feedback`,
                  "linear-gradient(135deg, #fef9c3, #fde68a)",
                  "#854d0e",
                  "⚠️"
                )}

                {renderMetricCard(
                  "Help",
                  selectedLessonReport.summary.help,
                  `${selectedLessonReport.percentages.help}% of feedback`,
                  "linear-gradient(135deg, #fee2e2, #fecaca)",
                  "#991b1b",
                  "🚨"
                )}

                {renderMetricCard(
                  "Total",
                  selectedLessonReport.summary.total,
                  `${selectedLessonReport.duration.duration_minutes} minutes`,
                  "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
                  "#0f172a",
                  "📘"
                )}
              </div>

              <div
                style={{
                  ...cardStyle,
                  background: "#ffffff",
                  boxShadow: "none",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Teacher summary</h3>
                <p style={{ ...mutedTextStyle, fontSize: "16px" }}>
                  {selectedLessonReport.report.overview}
                </p>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    borderRadius: "18px",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    fontWeight: 900,
                  }}
                >
                  {selectedLessonReport.report.recommendation}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: "18px",
                }}
              >
                <div
                  style={{
                    ...cardStyle,
                    background: "#ffffff",
                    boxShadow: "none",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Lesson trend</h3>

                  <div style={{ width: "100%", height: 310 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedLessonReport.graph}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          minTickGap={18}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="understand"
                          name="Understands"
                          stroke="#16a34a"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="slow_down"
                          name="Slow down"
                          stroke="#eab308"
                          strokeWidth={3}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="help"
                          name="Help"
                          stroke="#dc2626"
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div
                  style={{
                    ...cardStyle,
                    background: "#ffffff",
                    boxShadow: "none",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Key observations</h3>

                  {selectedLessonReport.report.insights.length === 0 ? (
                    <p style={mutedTextStyle}>No insights available.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {selectedLessonReport.report.insights.map((insight, index) => (
                        <div
                          key={index}
                          style={{
                            padding: "13px",
                            borderRadius: "16px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                            fontWeight: 750,
                          }}
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  ...cardStyle,
                  background: "#ffffff",
                  boxShadow: "none",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Beginning, middle, and end</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: "14px",
                  }}
                >
                  {selectedLessonReport.phases.map((phase) => (
                    <div
                      key={phase.phase}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "20px",
                        padding: "16px",
                        background: "#f8fafc",
                      }}
                    >
                      <h4 style={{ margin: "0 0 10px", fontSize: "18px" }}>
                        {phase.label}
                      </h4>

                      <p
                        style={{
                          ...mutedTextStyle,
                          minHeight: "52px",
                        }}
                      >
                        {phase.interpretation}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gap: "8px",
                          marginTop: "14px",
                          fontSize: "13px",
                          fontWeight: 900,
                        }}
                      >
                        <div style={{ color: "#166534" }}>
                          Understand: {phase.percentages.understand}%
                        </div>
                        <div style={{ color: "#854d0e" }}>
                          Slow down: {phase.percentages.slow_down}%
                        </div>
                        <div style={{ color: "#991b1b" }}>
                          Help: {phase.percentages.help}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight: "260px",
                display: "grid",
                placeItems: "center",
                color: "#64748b",
                fontWeight: 900,
              }}
            >
              No lesson report selected.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main style={pageStyle}>
      {renderLessonModal()}

      <div style={shellStyle}>
        {notification.visible && (
          <div
            style={{
              position: "fixed",
              top: isVeryCompact ? "14px" : "24px",
              right: isVeryCompact ? "14px" : "28px",
              left: isVeryCompact ? "14px" : "auto",
              zIndex: 90,
              maxWidth: isVeryCompact ? "none" : "430px",
              background: "linear-gradient(135deg, #fee2e2, #fecaca)",
              color: "#7f1d1d",
              border: "1px solid #fca5a5",
              borderRadius: "20px",
              padding: "16px 18px",
              fontWeight: 950,
              boxShadow: "0 20px 45px rgba(127, 29, 29, 0.22)",
              animation: "modalRise 0.25s ease both",
            }}
          >
            🚨 {notification.message}
          </div>
        )}

        <header
          style={{
            ...cardStyle,
            padding: isVeryCompact ? "22px" : "30px",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr auto",
            gap: "22px",
            alignItems: "center",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.95))",
            color: "#ffffff",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "320px",
              height: "320px",
              borderRadius: "999px",
              background: "rgba(37, 99, 235, 0.3)",
              top: "-155px",
              right: "-70px",
              filter: "blur(2px)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "8px 13px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.14)",
                marginBottom: "15px",
                fontSize: "13px",
                fontWeight: 900,
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: activeLesson ? "#22c55e" : "#f97316",
                  animation: activeLesson ? "pulseGlow 1.8s ease infinite" : "none",
                }}
              />
              {activeLesson ? "Lesson running" : "No lesson active"}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(36px, 5vw, 62px)",
                lineHeight: 1,
                letterSpacing: "-0.06em",
              }}
            >
              Classroom Dashboard
            </h1>

            <p
              style={{
                margin: "15px 0 0",
                color: "#cbd5e1",
                maxWidth: "760px",
                fontSize: "clamp(15px, 1.4vw, 18px)",
                lineHeight: 1.65,
              }}
            >
              A simple teacher view for live understanding, pacing concerns,
              help requests, and lesson-level reports.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              justifySelf: isCompact ? "start" : "end",
              display: "grid",
              gap: "10px",
              minWidth: isCompact ? "100%" : "300px",
            }}
          >
            <div
              style={{
                padding: "15px",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <div style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: 900 }}>
                CURRENT LESSON
              </div>
              <div style={{ marginTop: "5px", fontWeight: 950, fontSize: "19px" }}>
                {activeLesson ? activeLesson.title : "Not started"}
              </div>
            </div>

            <div
              style={{
                padding: "15px",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <div style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: 900 }}>
                SELECTED VIEW
              </div>
              <div style={{ marginTop: "5px", fontWeight: 950, fontSize: "19px" }}>
                {selectedStudent === "all" ? "Whole class" : selectedStudent}
              </div>
            </div>
          </div>
        </header>

        <section
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1.1fr",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div>
            <p style={labelStyle}>Lesson control</p>

            <h2 style={{ margin: 0, fontSize: "clamp(23px, 2vw, 31px)" }}>
              {activeLesson ? activeLesson.title : "Start a lesson"}
            </h2>

            <p style={{ ...mutedTextStyle, marginTop: "8px" }}>
              {activeLesson
                ? `Started at ${formatTimestamp(activeLesson.start_time)}`
                : "Start a lesson so feedback is grouped into a clear session report."}
            </p>

            {lessonMessage && (
              <p
                style={{
                  marginTop: "12px",
                  color: lessonMessage.toLowerCase().includes("error")
                    ? "#991b1b"
                    : "#166534",
                  fontWeight: 900,
                }}
              >
                {lessonMessage}
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isVeryCompact ? "1fr" : "1fr auto auto",
              gap: "12px",
              alignItems: "end",
            }}
          >
            <div>
              <label style={labelStyle}>Lesson name</label>
              <input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Maths - Fractions"
                style={inputStyle}
                disabled={lessonBusy}
              />
            </div>

            <button
              onClick={handleStartLesson}
              disabled={lessonBusy}
              style={{
                ...primaryButtonStyle,
                opacity: lessonBusy ? 0.65 : 1,
                cursor: lessonBusy ? "not-allowed" : "pointer",
              }}
            >
              Start
            </button>

            <button
              onClick={handleEndLesson}
              disabled={lessonBusy || !activeLesson}
              style={{
                ...dangerButtonStyle,
                opacity: lessonBusy || !activeLesson ? 0.55 : 1,
                cursor: lessonBusy || !activeLesson ? "not-allowed" : "pointer",
              }}
            >
              End
            </button>
          </div>
        </section>

        {moodData && moodBadge && (
          <section
            style={{
              ...cardStyle,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr auto",
              gap: "18px",
              alignItems: "center",
              borderLeft: `9px solid ${moodBadge.border}`,
            }}
          >
            <div>
              <p style={labelStyle}>What should the teacher know?</p>

              <h2 style={{ margin: 0, fontSize: "clamp(24px, 2.2vw, 34px)" }}>
                {moodData.message}
              </h2>

              <p style={{ ...mutedTextStyle, marginTop: "8px" }}>
                Calculated from the last {moodData.window_minutes} minutes of class
                feedback.
              </p>
            </div>

            <div
              style={{
                justifySelf: isCompact ? "start" : "end",
                background: moodBadge.background,
                color: moodBadge.color,
                border: `1px solid ${moodBadge.border}`,
                padding: "15px 21px",
                borderRadius: "999px",
                fontWeight: 950,
                whiteSpace: "nowrap",
                boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
              }}
            >
              {moodBadge.emoji} {moodBadge.text}
            </div>
          </section>
        )}



        <section
          style={{
            display: "grid",
            gridTemplateColumns: classPanelColumns,
            gap: "22px",
            alignItems: "stretch",
          }}
        >
          <div style={{ ...cardStyle, minHeight: "440px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "flex-start",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={sectionTitleStyle}>Class understanding</h2>
                <p style={{ ...mutedTextStyle, marginTop: "6px" }}>
                  Green means confident, yellow means slow down, red means help.
                </p>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                Current mood
              </div>
            </div>

            {moodData && hasPieData ? (
              <div style={{ width: "100%", height: isVeryCompact ? 315 : 365 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={isVeryCompact ? 88 : 112}
                      innerRadius={isVeryCompact ? 42 : 58}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) =>
                        `${name}: ${formatPercentage(value)}`
                      }
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatPercentage(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : moodData ? (
              <div
                style={{
                  minHeight: isVeryCompact ? 315 : 365,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  color: "#64748b",
                  fontWeight: 800,
                  padding: "18px",
                }}
              >
                No feedback has been recorded in the last {moodData.window_minutes} minutes,
                so the class understanding chart has no values to draw yet.
              </div>
            ) : (
              <p style={mutedTextStyle}>Loading mood data...</p>
            )}
          </div>

          <div style={{ ...cardStyle, minHeight: "440px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h2 style={sectionTitleStyle}>{graphTitle}</h2>
              <p style={{ ...mutedTextStyle, marginTop: "6px" }}>
                Use this to spot moments where students needed help or the pace
                changed.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: graphControlColumns,
                gap: "12px",
                alignItems: "end",
                marginBottom: "18px",
              }}
            >
              <div>
                <label style={labelStyle}>Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">Whole class</option>
                  {students.map((studentId) => (
                    <option key={studentId} value={studentId}>
                      {studentId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Time window</label>
                <select
                  value={`${graphWindowValue}-${graphWindowUnit}`}
                  onChange={(e) => {
                    const [value, unit] = e.target.value.split("-");
                    setGraphWindowValue(value);
                    setGraphWindowUnit(unit);
                  }}
                  style={selectStyle}
                >
                  <option value="30-minutes">Last 30 minutes</option>
                  <option value="2-hours">Last 2 hours</option>
                  <option value="24-hours">Last 24 hours</option>
                  <option value="7-days">Last 7 days</option>
                  <option value="30-days">Last 30 days</option>
                  <option value="1-months">Last month</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Group by</label>
                <select
                  value={graphGroupBy}
                  onChange={(e) => setGraphGroupBy(e.target.value)}
                  style={selectStyle}
                >
                  <option value="5min">5 minutes</option>
                  <option value="15min">15 minutes</option>
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                </select>
              </div>

              <button
                onClick={() => {
                  fetchGraph();
                  setShowGraph(true);
                }}
                style={primaryButtonStyle}
              >
                Show trend
              </button>
            </div>

            {showGraph && hasGraphData ? (
              <div style={{ width: "100%", height: isVeryCompact ? 320 : 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      minTickGap={22}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="understand"
                      name="Understands"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="slow_down"
                      name="Slow down"
                      stroke="#eab308"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="help"
                      name="Help"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  minHeight: "220px",
                  borderRadius: "20px",
                  background:
                    "linear-gradient(135deg, rgba(241,245,249,0.92), rgba(226,232,240,0.84))",
                  border: "1px dashed #cbd5e1",
                  display: "grid",
                  placeItems: "center",
                  padding: "22px",
                  textAlign: "center",
                  color: "#64748b",
                  fontWeight: 900,
                }}
              >
                {showGraph
                  ? "No trend data is available for the selected time window yet."
                  : "Choose settings and click “Show trend”."}
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: lowerPanelColumns,
            gap: "22px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "18px" }}>
            {renderMiniSummary(
              selectedStudent === "all"
                ? "Student focus"
                : `${selectedStudent} summary`,
              selectedStudent === "all" ? null : studentSummary
            )}

            <div style={softCardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                Student drill-down
              </h3>

              {selectedStudent === "all" ? (
                <p style={mutedTextStyle}>
                  Select a student above to view their individual feedback pattern.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  <p style={mutedTextStyle}>
                    Viewing feedback profile for{" "}
                    <strong style={{ color: "#0f172a" }}>{selectedStudent}</strong>.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Recent
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 950 }}>
                        {studentEvents.length}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Help
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 950 }}>
                        {studentSummary?.help ?? 0}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Total
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 950 }}>
                        {studentSummary?.total ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={softCardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
                Lesson reports
              </h3>

              {lessons.length === 0 ? (
                <p style={mutedTextStyle}>No lessons recorded yet.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => fetchLessonReport(lesson.id)}
                      style={{
                        textAlign: "left",
                        padding: "14px",
                        borderRadius: "18px",
                        background:
                          lesson.status === "active" ? "#dcfce7" : "#f8fafc",
                        border:
                          lesson.status === "active"
                            ? "1px solid #86efac"
                            : "1px solid #e2e8f0",
                        cursor: "pointer",
                        color: "#0f172a",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 950,
                          color:
                            lesson.status === "active" ? "#166534" : "#0f172a",
                        }}
                      >
                        {lesson.title}
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#64748b",
                          fontSize: "13px",
                          fontWeight: 800,
                        }}
                      >
                        {lesson.status.toUpperCase()} · Started{" "}
                        {formatShortTime(lesson.start_time)}
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          color: "#2563eb",
                          fontSize: "13px",
                          fontWeight: 950,
                        }}
                      >
                        Open report →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "flex-start",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={sectionTitleStyle}>
                  {selectedStudent === "all"
                    ? "Live feedback"
                    : `${selectedStudent} feedback`}
                </h2>
                <p style={{ ...mutedTextStyle, marginTop: "6px" }}>
                  {selectedStudent === "all"
                    ? "Most recent feedback from all student pods."
                    : "Most recent feedback from the selected student."}
                </p>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: "13px",
                  fontWeight: 950,
                }}
              >
                {displayedEvents.length} events
              </div>
            </div>

            {displayedEvents.length === 0 ? (
              <div
                style={{
                  borderRadius: "18px",
                  border: "1px dashed #cbd5e1",
                  background: "#f8fafc",
                  padding: "28px",
                  color: "#64748b",
                  fontWeight: 900,
                  textAlign: "center",
                }}
              >
                No feedback yet.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  maxHeight: isCompact ? "none" : "560px",
                  overflowY: isCompact ? "visible" : "auto",
                  paddingRight: isCompact ? 0 : "6px",
                }}
              >
                {displayedEvents.map((event) => {
                  const actionStyle = getActionStyle(event.action);

                  return (
                    <div
                      key={event.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "19px",
                        padding: "15px",
                        background: "#ffffff",
                        boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
                        animation: "fadeSlideUp 0.35s ease both",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <strong style={{ fontSize: "15px" }}>
                          {event.student_id}
                        </strong>

                        <span
                          style={{
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: 800,
                          }}
                        >
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "7px 11px",
                            borderRadius: "999px",
                            border: `1px solid ${actionStyle.border}`,
                            background: actionStyle.background,
                            color: actionStyle.color,
                            fontWeight: 950,
                            fontSize: "13px",
                          }}
                        >
                          {formatActionLabel(event.action)}
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 850,
                            color: "#475569",
                            background: "#f1f5f9",
                            borderRadius: "999px",
                            padding: "6px 10px",
                          }}
                        >
                          {event.lesson_title
                            ? event.lesson_title
                            : event.lesson_id
                              ? `Lesson #${event.lesson_id}`
                              : "No lesson"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Moved lower on the page because the total counters are supporting information, not the main teacher decision area. */}
        {summary && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: summaryColumns,
              gap: "16px",
            }}
          >
            {renderMetricCard(
              "Understands",
              summary.understand,
              "Confident feedback",
              "linear-gradient(135deg, #dcfce7, #bbf7d0)",
              "#166534",
              "✅"
            )}

            {renderMetricCard(
              "Slow down",
              summary.slow_down,
              "Pacing concerns",
              "linear-gradient(135deg, #fef9c3, #fde68a)",
              "#854d0e",
              "⚠️"
            )}

            {renderMetricCard(
              "Needs help",
              summary.help,
              "Support requests",
              "linear-gradient(135deg, #fee2e2, #fecaca)",
              "#991b1b",
              "🚨"
            )}

            {renderMetricCard(
              "Total signals",
              summary.total,
              "All feedback events",
              "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
              "#0f172a",
              "📊"
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;