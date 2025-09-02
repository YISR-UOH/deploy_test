import { useState, useCallback, useMemo, useContext, useEffect } from "react";
import { UserContext } from "../../Context/UserContext";
import { ServerContext } from "../../Context/ServerContext";
import styles from "./DashBoard.module.css";
import { useNavigate } from "react-router-dom";
import StatOrden from "./Components/StatOrden.jsx";

const Dashboard = () => {
  const { user, setOrder, order } = useContext(UserContext);
  const { getSummary } = useContext(ServerContext);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detailedView, setDetailedView] = useState(false);
  const navigate = useNavigate();

  const fetchSummary = useCallback(async () => {
    if (!user?.code) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSummary(user.code);
      setSummary(data);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError("No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }, [user?.code, getSummary]);

  useEffect(() => {
    fetchSummary();
  }, [user?.token]);

  const calcPercent = (done, total) => {
    if (!total || total <= 0) return 0;
    return Math.round((done / total) * 100);
  };

  // Nuevo componente para barra de progreso compuesta
  const CompositeProgressBar = ({ completed, cancelled, total, label }) => {
    const completedPct = calcPercent(completed, total);
    const cancelledPct = calcPercent(cancelled, total);
    const totalProcessedPct = completedPct + cancelledPct;

    return (
      <div className={styles.progressWrapper}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFillCompleted}
            style={{ width: completedPct + "%" }}
          />
          <div
            className={styles.progressFillCancelled}
            style={{
              width: cancelledPct + "%",
              left: completedPct + "%",
            }}
          />
        </div>
        <div className={styles.progressLabel}>
          <span>{label}</span>
          <span>
            {completed + cancelled}/{total} ({totalProcessedPct}%)
            {cancelled > 0 && (
              <span className={styles.cancelledIndicator}>
                {" "}
                [{cancelled} canceladas]
              </span>
            )}
          </span>
        </div>
      </div>
    );
  };

  const [sort, setSort] = useState("progress");
  const [expanded, setExpanded] = useState({});
  const toggleExpanded = (code) =>
    setExpanded((p) => ({ ...p, [code]: !p[code] }));

  const sortedMaintainers = useMemo(() => {
    const arr = [...(summary?.assigned_maintainers || [])];
    return arr.sort((a, b) => {
      const aPct = calcPercent(a.orders_completed, a.orders_total);
      const bPct = calcPercent(b.orders_completed, b.orders_total);
      if (sort === "progress") return bPct - aPct;
      if (sort === "orders")
        return (b.orders_total || 0) - (a.orders_total || 0);
      if (sort === "name")
        return (a.nombre || "").localeCompare(b.nombre || "");
      return 0;
    });
  }, [summary?.assigned_maintainers, sort]);

  const statusLabel = (s) =>
    s === 0
      ? "Pendiente"
      : s === 1
      ? "En Proceso"
      : s === 2
      ? "Completada"
      : s === 3
      ? "Cancelada"
      : "";
  const statusClass = (s) =>
    s === 2
      ? styles.status2
      : s === 1
      ? styles.status1
      : s === 3
      ? styles.status3
      : styles.status0;

  const TotalsSection = () => {
    const totals = summary?.totals || {};
    const ordersCompletedTotal = totals.orders_completed ?? 0;
    const ordersCancelledTotal = totals.orders_cancelled ?? 0;
    const tasksCompletedTotal = totals.tasks_completed ?? 0;
    const tasksCancelledTotal = totals.tasks_cancelled ?? 0;
    const totalDurationHours =
      (summary?.totals?.total_duration_seconds || 0) / 3600;
    const totalEstimatedHours =
      summary?.totals?.horas_estimadas.toFixed(2) || 0;

    return (
      <div className={styles.section + " " + styles.fadeIn}>
        <div className={styles.sectionHeader}>
          <h2>Resumen General</h2>
        </div>
        <div className={styles.summaryGrid}>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Órdenes (Total)</p>
            <div className={styles.cardValue}>{totals.orders ?? 0}</div>
            <CompositeProgressBar
              completed={ordersCompletedTotal}
              cancelled={ordersCancelledTotal}
              total={totals.orders ?? 0}
              label="Procesadas"
            />
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Tareas (Total)</p>
            <div className={styles.cardValue}>{totals.tasks ?? 0}</div>
            <CompositeProgressBar
              completed={tasksCompletedTotal}
              cancelled={tasksCancelledTotal}
              total={totals.tasks ?? 0}
              label="Procesadas"
            />
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Mantenedores</p>
            <div className={styles.cardValue} style={{ fontSize: "2.2rem" }}>
              {summary?.assigned_maintainers?.length ?? 0}
            </div>
            <small className={styles.progressLabel}>
              (Activos actualmente)
            </small>
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>H.H. / Tiempo Estimado</p>
            <div
              className={styles.cardValue}
              style={{
                gap: "0 important",
                padding: "0 important",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "fit-content important",
              }}
            >
              <span style={{ padding: "0", height: "fit-content important" }}>
                {summary?.assigned_maintainers?.length * 44 || 0}
              </span>
              /
              <p
                style={{
                  color: "#ff0c0cff",
                  height: "fit-content important",
                  padding: "0",
                  margin: "0",
                }}
              >
                {totalEstimatedHours || 0}
              </p>
            </div>
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Tiempo</p>
            <div className={styles.cardValue}>
              {totalDurationHours
                ? totalDurationHours.toFixed(2) + " hrs" || 0
                : "0 hrs"}
            </div>
            <CompositeProgressBar
              completed={totalDurationHours.toFixed(2)}
              cancelled={0}
              total={totalEstimatedHours || 0}
              label="Tiempo Total (hrs)"
            />
          </div>
        </div>
        <div className={styles.kpiExtraGrid} style={{ marginTop: 16 }}>
          <div className={styles.kpiMini}>
            <span>Órdenes Pendientes</span>
            <strong>
              {(summary?.assigned_maintainers || []).reduce(
                (acc, m) => acc + (m.orders_pending || 0),
                0
              )}
            </strong>
          </div>
          <div className={styles.kpiMini}>
            <span>Órdenes En Proceso</span>
            <strong>
              {(summary?.assigned_maintainers || []).reduce(
                (acc, m) => acc + (m.orders_in_progress || 0),
                0
              )}
            </strong>
          </div>
          <div className={styles.kpiMini}>
            <span>Órdenes Completadas</span>
            <strong>
              {(summary?.assigned_maintainers || []).reduce(
                (acc, m) => acc + (m.orders_completed || 0),
                0
              )}
            </strong>
          </div>
          <div className={styles.kpiMini}>
            <span>Órdenes Canceladas</span>
            <strong>
              {(summary?.assigned_maintainers || []).reduce(
                (acc, m) => acc + (m.orders_cancelled || 0),
                0
              )}
            </strong>
          </div>
          <div className={styles.kpiMini}>
            <span>Tareas Completadas</span>
            <strong>{totals.tasks_completed ?? 0}</strong>
          </div>
          <div className={styles.kpiMini}>
            <span>Tareas Canceladas</span>
            <strong>{totals.tasks_cancelled ?? 0}</strong>
          </div>
        </div>
      </div>
    );
  };

  const MaintainersSection = () => {
    const maintainers = sortedMaintainers;
    if (!maintainers.length) return null;
    return (
      <div className={styles.section + " " + styles.fadeIn}>
        <div className={styles.sectionHeader}>
          <h2>Mantenedores</h2>
        </div>
        <div className={styles.sortBar}>
          <span>Ordenar por:</span>
          {[
            { key: "progress", label: "% Avance" },
            { key: "orders", label: "# Órdenes" },
            { key: "name", label: "Nombre" },
          ].map((b) => (
            <button
              key={b.key}
              className={sort === b.key ? "active" : ""}
              onClick={() => setSort(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className={styles.maintainersList}>
          {maintainers.map((m) => {
            const total = m.orders_total ?? m.orders?.length ?? 0;
            const done = m.orders_completed ?? 0;
            const progress = calcPercent(done, total);
            const expandedState = !!expanded[m.code];
            const tasksDone =
              m.tasks_completed ??
              m.orders?.reduce((acc, o) => acc + (o.tasks_completed || 0), 0) ??
              0;
            const tasksTotal =
              m.tasks_total ??
              m.orders?.reduce((acc, o) => acc + (o.tasks_total || 0), 0) ??
              0;
            const tasksPct = calcPercent(tasksDone, tasksTotal);
            return (
              <div key={m.code} className={styles.maintainerCard}>
                <span className={styles.codeBadge}>#{m.code}</span>
                <div
                  className={styles.maintainerCardHeader}
                  title="Ver detalle de órdenes"
                >
                  <h3 className={styles.maintainerName}>{m.nombre}</h3>
                  <button
                    type="button"
                    aria-label={expandedState ? "Contraer" : "Expandir"}
                    className={
                      styles.toggleBtn +
                      (expandedState ? " " + styles.toggleOpen : "")
                    }
                    onClick={() => toggleExpanded(m.code)}
                  >
                    {expandedState ? "▾" : "▸"}
                  </button>
                </div>
                <div className={styles.inlineStats}>
                  <span className={styles.badge}>
                    Órdenes: <strong>{total}</strong>
                  </span>
                  <span className={styles.badge}>
                    Pend.: <strong>{m.orders_pending ?? 0}</strong>
                  </span>
                  <span className={styles.badge}>
                    Prog.: <strong>{m.orders_in_progress ?? 0}</strong>
                  </span>
                  <span className={styles.badge}>
                    Comp.: <strong>{done}</strong>
                  </span>
                  <span className={styles.badge}>
                    Canc.: <strong>{m.orders_cancelled ?? 0}</strong>
                  </span>
                </div>
                <CompositeProgressBar
                  completed={done}
                  cancelled={m.orders_cancelled ?? 0}
                  total={total}
                  label="Avance Órdenes"
                />
                <CompositeProgressBar
                  completed={tasksDone}
                  cancelled={m.tasks_cancelled ?? 0}
                  total={tasksTotal}
                  label="Avance Tareas"
                />
                {expandedState && (
                  <div className={styles.ordersList}>
                    {(m.orders || []).map((o) => {
                      const tPct = calcPercent(
                        o.tasks_completed,
                        o.tasks_total
                      );
                      return (
                        <div key={o.code} className={styles.orderItem}>
                          <div
                            className={styles.orderHeader}
                            onClick={() => {
                              setOrder({ ...order, active: o.code });
                              setDetailedView(true);
                            }}
                          >
                            <strong>Orden #{o.code}</strong>
                            <span
                              className={
                                styles.statusBadge + " " + statusClass(o.status)
                              }
                            >
                              {statusLabel(o.status)}
                            </span>
                          </div>
                          <div className={styles.tasksBar}>
                            <div
                              className={styles.tasksFillCompleted}
                              style={{
                                width:
                                  calcPercent(
                                    o.tasks_completed,
                                    o.tasks_total
                                  ) + "%",
                              }}
                            />
                            <div
                              className={styles.tasksFillCancelled}
                              style={{
                                width:
                                  calcPercent(
                                    o.tasks_cancelled || 0,
                                    o.tasks_total
                                  ) + "%",
                                left:
                                  calcPercent(
                                    o.tasks_completed,
                                    o.tasks_total
                                  ) + "%",
                              }}
                            />
                          </div>
                          <div className={styles.tasksLabel}>
                            <span>Tareas</span>
                            <span>
                              {(o.tasks_completed || 0) +
                                (o.tasks_cancelled || 0)}
                              /{o.tasks_total} (
                              {calcPercent(
                                (o.tasks_completed || 0) +
                                  (o.tasks_cancelled || 0),
                                o.tasks_total
                              )}
                              %)
                              {(o.tasks_cancelled || 0) > 0 && (
                                <span className={styles.cancelledIndicator}>
                                  {" "}
                                  [{o.tasks_cancelled} canceladas]
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const closeDetailedView = () => setDetailedView(false);
  return (
    <div className={styles.dashboardContainer}>
      {detailedView && (
        <div className={styles.detailedStat}>
          <StatOrden close={closeDetailedView} />
        </div>
      )}
      <div className={styles.headerRow}>
        <h1>
          {" "}
          {user?.name || ""} (código {user?.code})
        </h1>
      </div>
      {loading && <div className={styles.loading}>Cargando resumen...</div>}
      {error && !loading && <div className={styles.error}>{error}</div>}
      {!loading && !error && !summary && (
        <div className={styles.empty}>Sin datos de resumen.</div>
      )}
      {!loading && !error && summary && (
        <>
          <TotalsSection />
          <MaintainersSection />
        </>
      )}
    </div>
  );
};

export default Dashboard;
