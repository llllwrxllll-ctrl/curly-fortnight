/* App.jsx — v2: set complete checkbox + auto rest timer + no hangover menu */
import React, { useEffect, useMemo, useState } from "react";
import { Download, Upload, CalendarDays, Dumbbell, Plus, Check, Trash2, Save, LaptopMinimal, Timer, ChevronRight, RefreshCw, FileDown, HelpCircle, Bell, Pause, Play, SkipForward } from "lucide-react";

const STORAGE_KEY = "hypertrophy_app_v1";
const todayStr = () => new Date().toISOString().slice(0, 10);
const weekStart = (d = new Date()) => {
  const dt = new Date(d); const day = dt.getDay(); const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff); dt.setHours(0,0,0,0); return dt;
};
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const fmt = (d) => new Date(d).toISOString().slice(0, 10);
const dayNames = ["일","월","화","수","목","금","토"];
const planDayOrder = ["월","화","수","목","금"];

const EX_COMPOUND = /(스쿼트|프레스|벤치|데드리프트|로우|풀업|풀다운|힙 쓰러스트|스플릿|프론트 스쿼트|레그 프레스)/i;
const EX_ISO = /(레터럴|익스텐션|페이스풀|플라이|카프|컬\b|이두|푸시다운)/i;
const classifyExercise = (name) => (EX_ISO.test(name) ? "isolation" : EX_COMPOUND.test(name) ? "compound" : "compound");
const restSecondsFor = (name) => (classifyExercise(name) === "compound" ? 150 : 60);

const defaultPlan = {
  "월": { name: "Push (가슴/어깨/삼두)", exercises: [
    { name: "스미스 인클라인 벤치프레스", prescription: "4세트 6~8회" },
    { name: "플랫 덤벨 프레스", prescription: "3세트 8~10회" },
    { name: "머신 숄더 프레스", prescription: "4세트 8~10회" },
    { name: "레터럴 레이즈", prescription: "4세트 12~15회" },
    { name: "트라이셉스 로프 푸시다운", prescription: "3세트 10~12회" },
    { name: "오버헤드 트라이셉스 익스텐션", prescription: "2세트 10~12회" },
  ]},
  "화": { name: "Pull (등/이두)", exercises: [
    { name: "풀업(가중 가능)", prescription: "4세트 6~8회" },
    { name: "플레이트 로드 풀다운", prescription: "4세트 8~10회" },
    { name: "바벨 벤트오버 로우", prescription: "4세트 6~8회" },
    { name: "시티드 케이블 로우", prescription: "3세트 10~12회" },
    { name: "인클라인 덤벨 컬", prescription: "3세트 10~12회" },
    { name: "바벨 컬", prescription: "2세트 8~10회" },
  ]},
  "수": { name: "Legs (하체)", exercises: [
    { name: "V-스쿼트", prescription: "4세트 6~8회" },
    { name: "해크 스쿼트", prescription: "4세트 8~10회" },
    { name: "루마니안 데드리프트", prescription: "4세트 8~10회" },
    { name: "레그 익스텐션", prescription: "3세트 12~15회" },
    { name: "라잉 레그 컬", prescription: "3세트 10~12회" },
    { name: "카프 레이즈", prescription: "4세트 12~15회" },
  ]},
  "목": { name: "Upper (상체 보강)", exercises: [
    { name: "플랫 바벨 벤치프레스", prescription: "4세트 6~8회" },
    { name: "머신 인클라인 프레스", prescription: "3세트 8~10회" },
    { name: "랫풀다운(넓은 그립)", prescription: "4세트 8~10회" },
    { name: "덤벨 숄더 프레스", prescription: "3세트 8~10회" },
    { name: "레터럴 레이즈", prescription: "3세트 12~15회" },
    { name: "페이스풀", prescription: "3세트 12~15회" },
  ]},
  "금": { name: "Lower (하체 보강)", exercises: [
    { name: "프론트 스쿼트", prescription: "4세트 6~8회" },
    { name: "레그 프레스", prescription: "4세트 8~10회" },
    { name: "힙 쓰러스트", prescription: "4세트 8~10회" },
    { name: "불가리안 스플릿 스쿼트", prescription: "3세트 10~12회" },
    { name: "시티드 레그 컬", prescription: "3세트 10~12회" },
    { name: "카프 레이즈", prescription: "4세트 12~15회" },
  ]},
};

const quickRoutines = {
  "30분 퀵루틴": [
    { name: "푸쉬업(발높임)", sets: 5 },
    { name: "밴드로우 또는 문틀 풀업", sets: 5 },
    { name: "스쿼트 점프", sets: 5 },
  ],
};

const loadState = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return null; return JSON.parse(raw); }
  catch { return null; }
};
const saveState = (st) => localStorage.setItem(STORAGE_KEY, JSON.stringify(st));

export default function App() {
  const [state, setState] = useState(() => loadState() || { plan: defaultPlan, logs: [], settings: { units: "kg", defaultRIR: 2 } });
  const [selectedDay, setSelectedDay] = useState(() => koreanDay(new Date()));
  const [activeTab, setActiveTab] = useState("today");
  const [noGym, setNoGym] = useState(false);

  const [restTimer, setRestTimer] = useState({ running: false, secondsLeft: 0, total: 0, label: "", startedAt: null });

  useEffect(() => { saveState(state); }, [state]);
  function koreanDay(date) { const d = new Date(date); return dayNames[d.getDay()]; }

  const thisWeek = useMemo(() => { const ws = weekStart(); return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); }, []);

  const getLogForDate = (dateStr) => state.logs.find((l) => l.date === dateStr);
  const upsertLog = (log) => setState((prev) => {
    const exists = prev.logs.some((l) => l.date === log.date);
    const logs = exists ? prev.logs.map((l) => (l.date === log.date ? log : l)) : [...prev.logs, log];
    return { ...prev, logs };
  });

  const today = todayStr();
  const currentPlan = state.plan[selectedDay] || { name: "", exercises: [] };

  const startTodayIfEmpty = () => {
    const existing = getLogForDate(today); if (existing) return existing;
    const exercises = currentPlan.exercises.map((ex) => ({ exercise: ex.name, prescription: ex.prescription, sets: [], notes: "" }));
    const newLog = { date: today, dayName: selectedDay, exercises, noGym, createdAt: new Date().toISOString() };
    upsertLog(newLog); return newLog;
  };

  const [session, setSession] = useState(null);
  useEffect(() => { if (activeTab === "today") setSession(getLogForDate(today) || null); }, [selectedDay, activeTab, state.logs.length]);

  const addSet = (exIdx) => {
    if (!session) return;
    const next = { ...session };
    next.exercises = session.exercises.map((ex, i) => i === exIdx ? { ...ex, sets: [...ex.sets, { weight: "", reps: "", rir: state.settings.defaultRIR, done: false }] } : ex);
    setSession(next);
  };
  const updateSet = (exIdx, setIdx, field, value) => {
    if (!session) return;
    const next = { ...session };
    next.exercises = session.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s));
      return { ...ex, sets };
    });
    setSession(next);
  };
  const deleteSet = (exIdx, setIdx) => {
    if (!session) return;
    const next = { ...session };
    next.exercises = session.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = ex.sets.filter((_, j) => j !== setIdx);
      return { ...ex, sets };
    });
    setSession(next);
  };
  const saveSession = () => { if (!session) return; upsertLog({ ...session, updatedAt: new Date().toISOString() }); };
  const startSession = () => { const s = startTodayIfEmpty(); setSession(s); };

  const fmtSec = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const beep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.stop(ctx.currentTime + 0.65);
    } catch {}
  };
  const startRest = (exName) => {
    const secs = restSecondsFor(exName);
    setRestTimer({ running: true, secondsLeft: secs, total: secs, label: classifyExercise(exName) === "compound" ? "복합 2:30" : "단관절 1:00", startedAt: Date.now() });
  };
  const pauseRest = () => setRestTimer((rt) => ({ ...rt, running: false }));
  const resumeRest = () => setRestTimer((rt) => (rt.secondsLeft > 0 ? { ...rt, running: true } : rt));
  const skipRest = () => setRestTimer((rt) => ({ ...rt, running: false, secondsLeft: 0 }));

  useEffect(() => {
    if (!restTimer.running) return;
    const id = setInterval(() => {
      setRestTimer((rt) => {
        if (!rt.running) return rt;
        const next = rt.secondsLeft - 1;
        if (next <= 0) { beep(); return { ...rt, running: false, secondsLeft: 0 }; }
        return { ...rt, secondsLeft: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restTimer.running]);

  const exportCSV = () => {
    const rows = ["date,day,exercise,set,weight,reps,rir,done"];
    state.logs.sort((a, b) => a.date.localeCompare(b.date)).forEach((log) => {
      log.exercises.forEach((ex) => {
        ex.sets.forEach((s, i) => {
          rows.push([log.date, log.dayName || "", `"${ex.exercise}"`, i + 1, s.weight || "", s.reps || "", s.rir ?? "", s.done ? 1 : 0].join(","));
        });
      });
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `hypertrophy_logs_${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `hypertrophy_backup_${todayStr()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => { try { const data = JSON.parse(String(e.target?.result || "")); if (!data.plan || !data.logs) throw new Error("잘못된 파일"); setState(data); alert("불러오기 완료"); } catch (err) { alert("불러오기 실패: " + err.message); } };
    reader.readAsText(file);
  };
  const applyQuickRoutine = (key) => {
    const items = quickRoutines[key]; if (!items) return; const s = startTodayIfEmpty();
    const exs = items.map((it) => ({ exercise: it.name, prescription: `${it.sets}세트 자유반복`, sets: Array.from({ length: it.sets }, () => ({ weight: "BW", reps: "", rir: 2, done: false })), notes: key }));
    const newLog = { ...s, exercises: exs }; setSession(newLog);
  };
  const resetWeek = () => { if (!confirm("이번 주 표시를 초기화할까요? (데이터는 유지)")) return; setSelectedDay(koreanDay(new Date())); setNoGym(false); };

  const volumeSummary = useMemo(() => {
    const map = { chest: 0, shoulder: 0, triceps: 0, back: 0, biceps: 0, quads: 0, hams: 0, glutes: 0, calves: 0 };
    const guess = (n) => {
      if (/벤치|프레스|플라이|가슴/i.test(n)) return "chest";
      if (/레터럴|숄더|델트/i.test(n)) return "shoulder";
      if (/트라이셉|삼두/i.test(n)) return "triceps";
      if (/로우|랫풀|풀다운|풀업|광배|후면/i.test(n)) return "back";
      if (/컬\b|이두/i.test(n)) return "biceps";
      if (/스쿼트|레그 프레스|레그 익스텐션/i.test(n)) return "quads";
      if (/루마니안|레그 컬/i.test(n)) return "hams";
      if (/힙 쓰러스트|글루트/i.test(n)) return "glutes";
      if (/카프|비복/i.test(n)) return "calves";
      return null;
    };
    planDayOrder.forEach((k) => { (state.plan[k]?.exercises || []).forEach((ex) => { const m = ex.prescription.match(/(\d+)세트/); const sets = m ? Number(m[1]) : 0; const key = guess(ex.name); if (key) map[key] += sets; }); });
    return map;
  }, [state.plan]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Hypertrophy Coach</h1>
            <span className="text-xs text-neutral-500 ml-2">local-first</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm" onClick={() => setActiveTab("today")}>오늘</button>
            <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm" onClick={() => setActiveTab("plan")}>루틴 편집</button>
            <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm" onClick={() => setActiveTab("logs")}>로그/통계</button>
            <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm" onClick={() => setActiveTab("settings")}>설정</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <section className="bg-white rounded-2xl shadow-sm border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              <div className="font-medium">이번 주</div>
            </div>
            <button onClick={resetWeek} className="text-sm flex items-center gap-1 px-2 py-1 rounded-lg border"><RefreshCw className="w-4 h-4"/>표시 초기화</button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {thisWeek.map((d) => {
              const ds = fmt(d); const kday = koreanDay(d);
              const isPlan = planDayOrder.includes(kday); const logged = !!getLogForDate(ds); const isToday = ds === today;
              return (
                <button key={ds} onClick={() => setSelectedDay(kday)} className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${isToday ? "bg-neutral-900 text-white" : "bg-neutral-50"} ${logged ? "border-green-500" : "border-neutral-200"}`}>
                  <div className="text-sm">{kday}</div>
                  <div className="text-xs text-neutral-500">{ds.slice(5)}</div>
                  {isPlan && <div className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-neutral-800 text-white">루틴</div>}
                  {logged && <div className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-green-600 text-white">기록</div>}
                </button>
              );
            })}
          </div>
        </section>

        {/* 휴식 타이머 */}
        {restTimer.total > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5"/>
                <div className="font-semibold">휴식 타이머 · {restTimer.label}</div>
              </div>
              <div className="text-lg font-mono tabular-nums">{fmtSec(restTimer.secondsLeft)}</div>
            </div>
            <div className="mt-2 h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-900" style={{ width: `${restTimer.total ? ((restTimer.total - restTimer.secondsLeft) / restTimer.total) * 100 : 0}%` }} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {restTimer.running ? (
                <button onClick={pauseRest} className="px-3 py-1.5 rounded-xl border text-sm flex items-center gap-1"><Pause className="w-4 h-4"/>일시정지</button>
              ) : (
                <button onClick={resumeRest} className="px-3 py-1.5 rounded-xl border text-sm flex items-center gap-1"><Play className="w-4 h-4"/>재개</button>
              )}
              <button onClick={skipRest} className="px-3 py-1.5 rounded-xl border text-sm flex items-center gap-1"><SkipForward className="w-4 h-4"/>건너뛰기</button>
            </div>
          </div>
        )}

        {activeTab === "today" && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">선택 요일</div>
                  <div className="text-lg font-semibold">{selectedDay} · {state.plan[selectedDay]?.name || "루틴 없음"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm border rounded-lg px-2 py-1"><LaptopMinimal className="w-4 h-4"/>헬스장 불가<input type="checkbox" className="ml-1" checked={noGym} onChange={(e)=>setNoGym(e.target.checked)}/></label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm flex items-center gap-1" onClick={startSession}><Timer className="w-4 h-4"/>오늘 시작</button>
                <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm flex items-center gap-1" onClick={()=>applyQuickRoutine("30분 퀵루틴")}><ChevronRight className="w-4 h-4"/>퀵루틴 자동 채우기</button>
                <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm flex items-center gap-1" onClick={saveSession}><Save className="w-4 h-4"/>저장</button>
              </div>

              {!session and (
                <div className="mt-6 text-sm text-neutral-600 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 mt-0.5"/>
                  <p>"오늘 시작"을 누르면 {selectedDay} 루틴이 생성됩니다. 헬스장을 사용할 수 없으면 퀵루틴으로 대체하세요.</p>
                </div>
              )}

              {session && (
                <div className="mt-4 space-y-6">
                  {session.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="border rounded-2xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{ex.exercise}</div>
                          <div className="text-xs text-neutral-500">처방: {ex.prescription} · {classifyExercise(ex.exercise)==='compound'? '복합(2:30)': '단관절(1:00)'} 휴식</div>
                        </div>
                        <button className="text-sm px-2 py-1 rounded-lg border flex items-center gap-1" onClick={()=>addSet(exIdx)}><Plus className="w-4 h-4"/>세트 추가</button>
                      </div>

                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-neutral-500">
                              <th className="py-1 pr-2">세트</th>
                              <th className="py-1 pr-2">중량({state.settings.units})</th>
                              <th className="py-1 pr-2">반복</th>
                              <th className="py-1 pr-2">RIR</th>
                              <th className="py-1 pr-2">완료</th>
                              <th className="py-1 pr-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {ex.sets.map((s, setIdx) => (
                              <tr key={setIdx} className="border-t">
                                <td className="py-1 pr-2">{setIdx + 1}</td>
                                <td className="py-1 pr-2"><input value={s.weight} onChange={(e)=>updateSet(exIdx,setIdx,"weight",e.target.value)} placeholder="예: 80" className="w-24 px-2 py-1 rounded-lg border"/></td>
                                <td className="py-1 pr-2"><input value={s.reps} onChange={(e)=>updateSet(exIdx,setIdx,"reps",e.target.value)} placeholder="예: 8" className="w-16 px-2 py-1 rounded-lg border"/></td>
                                <td className="py-1 pr-2"><input value={s.rir} onChange={(e)=>updateSet(exIdx,setIdx,"rir",Number(e.target.value))} type="number" className="w-16 px-2 py-1 rounded-lg border"/></td>
                                <td className="py-1 pr-2">
                                  <input type="checkbox" checked={!!s.done} onChange={(e)=>{ const done = e.target.checked; updateSet(exIdx,setIdx,'done',done); if(done){ startRest(ex.exercise); } }} />
                                </td>
                                <td className="py-1 pr-2"><button className="px-2 py-1 rounded-lg border text-neutral-600" onClick={()=>deleteSet(exIdx,setIdx)}><Trash2 className="w-4 h-4"/></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm flex items-center gap-1" onClick={saveSession}><Check className="w-4 h-4"/>오늘 기록 저장</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "plan" && (
          <section className="bg-white rounded-2xl shadow-sm border p-4 space-y-4">
            <div className="text-lg font-semibold mb-2">루틴 편집</div>
            <div className="grid md:grid-cols-2 gap-4">
              {planDayOrder.map((k) => (
                <div key={k} className="border rounded-2xl p-3">
                  <div className="font-semibold mb-1">{k} · {state.plan[k]?.name}</div>
                  <ul className="space-y-2">
                    {(state.plan[k]?.exercises || []).map((ex, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input className="flex-1 px-2 py-1 rounded-lg border" value={ex.name} onChange={(e)=>{
                          setState((prev)=>({
                            ...prev,
                            plan:{ ...prev.plan, [k]:{ ...prev.plan[k], exercises: prev.plan[k].exercises.map((it,idx)=> idx===i?{...it,name:e.target.value}:it) } }
                          }))
                        }}/>
                        <input className="w-36 px-2 py-1 rounded-lg border" value={ex.prescription} onChange={(e)=>{
                          setState((prev)=>({
                            ...prev,
                            plan:{ ...prev.plan, [k]:{ ...prev.plan[k], exercises: prev.plan[k].exercises.map((it,idx)=> idx===i?{...it,prescription:e.target.value}:it) } }
                          }))
                        }}/>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="text-sm text-neutral-600">세트/반복 표기는 반드시 "4세트 6~8회" 형식을 유지하면 요약/볼륨 집계가 정확해집니다.</div>
          </section>
        )}

        {activeTab === "logs" && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">로그</div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm flex items-center gap-1" onClick={exportCSV}><FileDown className="w-4 h-4"/>CSV</button>
                  <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm flex items-center gap-1" onClick={exportJSON}><Download className="w-4 h-4"/>백업(JSON)</button>
                </div>
              </div>
              <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto">
                {state.logs.length === 0 && (<div className="text-sm text-neutral-500">아직 기록 없음.</div>)}
                {state.logs.slice().sort((a,b)=> b.date.localeCompare(a.date)).map((log) => (
                  <div key={log.date} className="border rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{log.date} · {log.dayName}</div>
                      <div className="text-xs text-neutral-500">{log.updatedAt?"수정됨":""}</div>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {log.exercises.map((ex, i) => (
                        <li key={i}>
                          <span className="font-medium">{ex.exercise}</span>
                          {ex.sets.length>0 ? (
                            <span className="text-neutral-500"> — {ex.sets.map((s,idx)=>`${idx+1}:${s.weight}×${s.reps}(RIR${s.rir}${s.done?",✓":""})`).join(" | ")}</span>
                          ) : (
                            <span className="text-neutral-400"> — 세트 기록 없음</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="text-lg font-semibold">주간 볼륨 요약(처방 기준 추정)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-sm">
                {Object.entries(volumeSummary).map(([k,v])=> (
                  <div key={k} className="border rounded-xl p-2 flex items-center justify-between">
                    <span className="uppercase text-neutral-500">{k}</span>
                    <span className="font-semibold">{v} 세트/주</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-neutral-500 mt-2">권장: 대근육 10~20세트/주 범위 내에서 유지. 하체/측면델트/광배 우선 배분.</div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="bg-white rounded-2xl shadow-sm border p-4 space-y-4">
            <div className="text-lg font-semibold">설정 & 데이터</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-2xl p-3">
                <div className="font-medium mb-2">일반</div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm w-28">중량 단위</label>
                  <select className="px-2 py-1 rounded-lg border" value={state.settings.units} onChange={(e)=>setState(prev=>({...prev, settings:{...prev.settings, units:e.target.value}}))}>
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm w-28">기본 RIR</label>
                  <input type="number" className="px-2 py-1 rounded-lg border w-24" value={state.settings.defaultRIR} onChange={(e)=>setState(prev=>({...prev, settings:{...prev.settings, defaultRIR:Number(e.target.value)}}))}/>
                </div>
              </div>

              <div className="border rounded-2xl p-3">
                <div className="font-medium mb-2">백업/복원</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm flex items-center gap-1" onClick={exportJSON}><Download className="w-4 h-4"/>백업(JSON)</button>
                  <label className="px-3 py-1.5 rounded-xl bg-neutral-100 border text-sm flex items-center gap-1 cursor-pointer">
                    <Upload className="w-4 h-4"/>복원(JSON)
                    <input type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) importJSON(f); }}/>
                  </label>
                </div>
                <div className="text-xs text-neutral-500 mt-2">CSV 내보내기는 "로그/통계" 탭에서 가능합니다.</div>
              </div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="font-medium mb-2">휴대폰 홈 화면 추가(A2HS)</div>
              <ol className="list-decimal list-inside text-sm text-neutral-600 space-y-1">
                <li>브라우저 메뉴(⋮ 또는 공유) 선택</li>
                <li>"홈 화면에 추가(Add to Home Screen)" 선택</li>
                <li>이름 입력 후 추가 → 앱처럼 실행</li>
              </ol>
              <div className="text-xs text-neutral-500 mt-2">오프라인 PWA 완성도를 높이려면 서비스워커/아이콘/매니페스트 구성이 필요합니다(본 프로젝트 포함).</div>
            </div>
          </section>
        )}
      </main>

      <footer className="py-8"/>
    </div>
  );
}
