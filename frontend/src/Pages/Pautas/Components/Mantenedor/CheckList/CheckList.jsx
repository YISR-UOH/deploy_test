import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { UserContext } from "../../../../../Context/UserContext.jsx";
import { ServerContext } from "../../../../../Context/ServerContext.jsx";
import styles from "./CheckList.module.css";
import { useNavigate } from "react-router-dom";
const CheckList = ({ cancel }) => {
  const { user, task } = useContext(UserContext);
  const { update_checklist } = useContext(ServerContext);
  // Estado unificado del checklist
  const [checklist, setChecklist] = useState(() => ({
    meta: {
      task_id: task?.task_id || null,
      detalle_mant: task?.detalle_mant || "",
      order_id: task?.order_id || null,
      mantenedor_code: user?.code || "",
      mantenedor_name: user?.name || "",
      fecha: new Date().toISOString().slice(0, 10),
    },
    answers: Array.from({ length: 7 }, (_, i) => ({
      item: i + 1,
      si: false,
      no: false,
      na: false,
      obs: "",
    })),
    otrasObservaciones: "",
    supervisor: {
      nombre: "",
      fecha: "",
      firma: "",
    },
  }));

  const navigate = useNavigate();
  const navigateToTareas = useCallback(() => {
    navigate("/Cartocor/pautas/detalle");
  }, []);

  const canFinalize = useMemo(() => {
    return checklist.answers.every((a) => a.si || a.no || a.na);
  }, [checklist.answers]);
  const handleSave = useCallback(async () => {
    if (!canFinalize) {
      alert("Debe completar todas las respuestas antes de guardar.");
      return;
    }
    try {
      const response = await update_checklist(task.order_id, jsonChecklist);
      if (response.message) {
        alert("Checklist guardado exitosamente.");
        cancel(); // Cerrar checklist después de guardar
        navigateToTareas(); // Navegar a tareas
      } else {
        alert("Error al guardar el checklist: " + response.detail);
      }
    } catch (error) {
      console.error("Error al guardar checklist:", error);
      alert("Ocurrió un error al guardar el checklist. Intente nuevamente.");
    }
  }, [checklist, canFinalize, update_checklist, cancel]);

  const toggleAnswer = useCallback((index, field) => {
    setChecklist((prev) => {
      const answers = prev.answers.map((a, i) => {
        if (i !== index) return a;
        // Reset otros campos para mantener exclusividad
        return {
          ...a,
          si: field === "si" ? !a.si : false,
          no: field === "no" ? !a.no : false,
          na: field === "na" ? !a.na : false,
        };
      });
      return { ...prev, answers };
    });
  }, []);

  const updateObsFila = useCallback((index, value) => {
    setChecklist((prev) => {
      const answers = prev.answers.map((a, i) =>
        i === index ? { ...a, obs: value } : a
      );
      return { ...prev, answers };
    });
  }, []);

  const updateSupervisor = useCallback((field, value) => {
    setChecklist((prev) => ({
      ...prev,
      supervisor: { ...prev.supervisor, [field]: value },
    }));
  }, []);

  const updateOtrasObservaciones = useCallback((value) => {
    setChecklist((prev) => ({ ...prev, otrasObservaciones: value }));
  }, []);

  // JSON derivado para envío
  const jsonChecklist = useMemo(
    () => ({
      ...checklist.meta,
      answers: checklist.answers.map((a) => ({
        item: a.item,
        estado: a.si ? "SI" : a.no ? "NO" : a.na ? "NA" : "",
        obs: a.obs.trim(),
      })),
      otras_observaciones: checklist.otrasObservaciones.trim(),
      supervisor: checklist.supervisor,
    }),
    [checklist]
  );

  const generateSelect = (item) => {
    const idx = item - 1;
    const answer = checklist.answers[idx];
    return (
      <>
        <td>
          <input
            type="checkbox"
            checked={answer.si}
            onChange={() => toggleAnswer(idx, "si")}
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={answer.no}
            onChange={() => toggleAnswer(idx, "no")}
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={answer.na}
            onChange={() => toggleAnswer(idx, "na")}
          />
        </td>
        <td>
          <textarea
            placeholder="..."
            className={styles.cellTextarea}
            rows={2}
            value={answer.obs}
            onChange={(e) => updateObsFila(idx, e.target.value)}
          />
        </td>
      </>
    );
  };

  return (
    <>
      <div className={styles.title}>
        <h2>CHECK LIST TERMINO DE MANTENCIÓN</h2>
      </div>
      <div className={styles.infoTarea}>
        <div className={styles.infoTareaLeft}>
          <span className={styles.label}>MAQUINA/CUERPO: </span>
          <span className={styles.value}>{task.detalle_mant}</span>
          <span className={styles.label}>NOMBRE MANTENEDOR: </span>
          <span className={styles.value}>{user.name}</span>
        </div>
        <div className={styles.infoTareaRight}>
          <span className={styles.label}>FECHA: </span>
          <span className={styles.value}>
            {new Date().toLocaleDateString("es-ES")}
          </span>
          <span className={styles.label}>FIRMA: </span>
          <span className={styles.value}>{user.code}</span>
        </div>
      </div>
      <div className={styles.checkListContainer}>
        <div className={styles.checkListText}>
          CONTESTE CON UNA "X" DENTRO DEL CASILLERO "SI", "NO" O "N/A" SEGÚN LA
          RESPUESTA QUE IDENTIFIQUE CORRESPONDIENTE A SU TRABAJO REALIZADO EN LA
          MANTENCION, DE SEÑALAR LA RESPUESTA "NO", DAR A CONOCER EL MOTIVO EN
          EL CASILLERO DE "OBSERVACIONES".
        </div>
        <div className={styles.checkList}>
          <table>
            <thead>
              <tr>
                <th rowSpan="2" className={styles.index}>
                  ITEM
                </th>
                <th rowSpan="2">INSPECCION PRIMARIA</th>
                <th colSpan="3">ESTADO</th>
                <th rowSpan="2">OBSERVACIONES</th>
              </tr>
              <tr>
                <th>SI</th>
                <th>NO</th>
                <th>N/A</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  ¿Verifico que retiro todas las herramientas utilizadas en la
                  mantencion y limpio antes de guardar?
                </td>
                {generateSelect(1)}
              </tr>
              <tr>
                <td>2</td>
                <td>
                  ¿Verifico que retiro todos los insumos utilizados en la
                  maquina? (Ejm: Grasas, trapos, envases, carton, etc).
                </td>
                {generateSelect(2)}
              </tr>
              <tr>
                <td>3</td>
                <td>
                  ¿Verifico que retiro todos los repuestos en la maquina y los
                  deja en lugar correcto?
                </td>
                {generateSelect(3)}
              </tr>
              <tr>
                <td>4</td>
                <td>
                  ¿Verifico que se encuentran puestas todas las tapas y
                  protecciones?
                </td>
                {generateSelect(4)}
              </tr>
              <tr>
                <td>5</td>
                <td>¿Dejo limpio y ordenado los sectores donde trabajo?</td>
                {generateSelect(5)}
              </tr>
              <tr>
                <td>6</td>
                <td>¿Retiro todos los dispositivos de bloqueo y/o lockout?</td>
                {generateSelect(6)}
              </tr>
              <tr>
                <td>7</td>
                <td>¿Probo el equipo antes de la puesta en marcha?</td>
                {generateSelect(7)}
              </tr>
            </tbody>
          </table>
          <div className={styles.observaciones}>
            Otras observaciones:
            <textarea
              placeholder="Escriba sus observaciones aquí..."
              className={styles.textarea}
              value={checklist.otrasObservaciones}
              onChange={(e) => updateOtrasObservaciones(e.target.value)}
            ></textarea>
          </div>
        </div>
        <div className={styles.revisionSupervisor}>
          <div className={styles.revisionTitle}>REVISION POR SUPERVISOR</div>
          <div className={styles.revisionInputs}>
            <span className={styles.label}>NOMBRE:</span>
            <input
              type="text"
              className={styles.input}
              value={checklist.supervisor.nombre}
              onChange={(e) => updateSupervisor("nombre", e.target.value)}
              placeholder={
                (task?.code_supervisor && task?.name_supervisor
                  ? task.code_supervisor + " - " + task.name_supervisor
                  : "Nombre del supervisor") || "Nombre del supervisor"
              }
              disabled={user.user_type === 2}
            />
            <span className={styles.label}>FECHA:</span>
            <input
              type="date"
              className={styles.input}
              value={checklist.supervisor.fecha}
              onChange={(e) => updateSupervisor("fecha", e.target.value)}
              disabled={user.user_type === 2}
            />
            <span className={styles.label}>FIRMA:</span>
            <input
              type="text"
              className={styles.input}
              value={checklist.supervisor.firma}
              onChange={(e) => updateSupervisor("firma", e.target.value)}
              placeholder="Firma del supervisor"
              disabled={user.user_type === 2}
            />
          </div>
        </div>
        <div className={styles.buttonRow}>
          <button className={styles.cancelButton} onClick={cancel}>
            Cancelar
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!canFinalize}
          >
            Guardar
          </button>
        </div>
      </div>
    </>
  );
};
export default CheckList;
