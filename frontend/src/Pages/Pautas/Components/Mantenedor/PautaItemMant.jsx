import { memo } from "react";
import styles from "../../Pautas.module.css";
import { useContext } from "react";
import { UserContext } from "../../../../Context/UserContext";
import { useNavigate } from "react-router-dom";
const PautaItemMant = memo(function PautaItemMant({ pauta }) {
  const { order, setOrder } = useContext(UserContext);
  const navigate = useNavigate();

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
            {pauta.assigned_by + " " + pauta.assigned_by_name || "Sin Asignar"}
          </div>
          <div className={styles.priorityContainer}>
            <strong>Prioridad:</strong>
            <span>{pauta.prioridad}</span>
          </div>
        </div>

        <div className={styles.obsContainer}>
          <strong>Observaciones:</strong>
          <span>{pauta.obs_orden}</span>
        </div>
      </div>
      <div className={styles.buttonsContainer}>
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

export default PautaItemMant;
