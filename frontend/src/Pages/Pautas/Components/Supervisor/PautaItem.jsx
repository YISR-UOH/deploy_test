import { useState, useEffect, memo } from "react";
import styles from "../../Pautas.module.css";
import { useContext } from "react";
import { UserContext } from "../../../../Context/UserContext";
import { useNavigate } from "react-router-dom";
const PautaItem = memo(function PautaItem({ pauta, mantenedores, onAssign }) {
  const [mantenedor, setMantenedor] = useState(pauta.assigned_to || "");
  const [obs, setObs] = useState(pauta.obs_orden || "");
  const [priority, setPriority] = useState(pauta.prioridad || "");
  const { order, setOrder } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    setMantenedor(pauta.assigned_to || "");
  }, [pauta.assigned_to]);
  useEffect(() => {
    setObs(pauta.obs_orden || "");
  }, [pauta.obs_orden]);
  useEffect(() => {
    setPriority(pauta.prioridad || "");
  }, [pauta.prioridad]);

  return (
    <div className={styles.pautaItem}>
      <div className={styles.pautaHeader}>
        <h3>Numero de Orden: {pauta.code}</h3>
        <p>Tiempo Estimado: {pauta.horas_estimadas} horas</p>
        <p>Número de tareas: {pauta.task_number}</p>
      </div>

      <div className={styles.pautaDetails}>
        <p>Descripción de la orden: {pauta.descripcion}</p>

        <p>Tipo de Servicio: {pauta.tipo_servicio}</p>
        <p>Frecuencia dias: {pauta.frecuencia_dias} </p>
      </div>

      {pauta.tareas && pauta.tareas.length > 0 && (
        <div className={styles.tasksList}>
          <div className={styles.tableContainer}>
            <table className={styles.tasksTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Taller</th>
                  <th>Descripción</th>
                  <th>Hs Estim</th>
                </tr>
              </thead>
              <tbody>
                {pauta.tareas.map((task, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{task.Taller || "-"}</td>
                    <td>{task.Descripcion || "-"}</td>
                    <td>{task["Hs Estim"] || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className={styles.assigned}>
        <div className={styles.assignedContainer}>
          <div className={styles.assignedBy}>
            <strong>Asignado por:</strong>{" "}
            {pauta.assigned_by
              ? pauta.assigned_by + " - " + pauta.assigned_by_name
              : "No Asignado"}
          </div>
          <div>
            <strong>Asignado a:</strong>{" "}
            <select
              name="assigned_to"
              id={pauta.code + "-assigned-to"}
              onChange={(e) => setMantenedor(e.target.value)}
              className={styles.selectInput}
              value={mantenedor}
            >
              <option value="">Sin Asignar</option>
              {mantenedores.map((mantenedorItem) => (
                <option key={mantenedorItem.code} value={mantenedorItem.code}>
                  {mantenedorItem.code + " - " + mantenedorItem.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.priorityContainer}>
            <strong>Prioridad:</strong>{" "}
            <select
              name="priority"
              id={pauta.code + "-priority"}
              className={styles.selectInput}
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
              }}
            >
              {[1, 2, 3].map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.obsContainer}>
          <strong>Observaciones:</strong>{" "}
          <textarea
            id={pauta.code + "-obs"}
            placeholder="Ingrese observaciones..."
            className={styles.obsInput}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.buttonsContainer}>
        {pauta.status === 2 ? (
          <button className={styles.assignButton} disabled={true}>
            Completada
          </button>
        ) : (
          <button
            className={styles.assignButton}
            onClick={() => onAssign(pauta.code, mantenedor, obs, priority)}
            disabled={mantenedor ? false : true}
          >
            Asignar Pauta
          </button>
        )}
        <div className={styles.viewButtonContainer}>
          <button
            className={styles.viewButton}
            onClick={() => {
              setOrder({
                ...order,
                anexosActive: true,
                anexos: pauta.protocolos,
              });
            }}
          >
            Ver Anexos
          </button>
          <button
            className={styles.viewButton}
            onClick={() => {
              setOrder({ ...order, active: pauta.code });
              navigate("/Cartocor/pautas/detalle");
            }}
          >
            Ver Pauta
          </button>
        </div>
      </div>
    </div>
  );
});

export default PautaItem;
