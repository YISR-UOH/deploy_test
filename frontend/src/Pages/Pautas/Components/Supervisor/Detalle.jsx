import { useState, useEffect, useContext } from "react";
import { UserContext } from "../../../../Context/UserContext";
import { ServerContext } from "../../../../Context/ServerContext";
import styles from "../Detalle.module.css";
import { PopupAnexos } from "../Anexos.jsx";
const Detalle = () => {
  const { order, setOrder } = useContext(UserContext);
  const {
    getMantenedores,
    assignPauta,
    set_task_obs_supervisor,
    get_order_with_data,
  } = useContext(ServerContext);
  const [pautaDetails, setPautaDetails] = useState(null);
  const [mantenedor, setMantenedor] = useState("");
  const [obs, setObs] = useState("");
  const [priority, setPriority] = useState("");
  const [mantenedores, setMantenedores] = useState([]);
  const [dataDict, setDataDict] = useState({});
  const [listTareas, setListTareas] = useState([]);

  const fetchPautas = async () => {
    try {
      const mantenedoresData = await getMantenedores();
      const data = await get_order_with_data(order.active);
      setListTareas(data.tasks);
      setPautaDetails(data);
      setMantenedores(mantenedoresData);
      setPautaDetails(data);
      setDataDict(data.orden.data.data);
    } catch (error) {
      console.error("Error al cargar las pautas:", error);
    }
  };
  useEffect(() => {
    fetchPautas();
  }, [order.active]);

  const handleCancelOrder = async () => {
    try {
      const userConfirmed = window.confirm(
        "¿Estás seguro de que deseas cancelar la orden? Las tareas no completadas serán canceladas."
      );
      if (userConfirmed) {
        // pide agregar observaciones
        const obs = window.prompt("Ingrese las motivo de cancelación:");
        if (obs !== null) {
          await cancel_order(pautaDetails.orden.code, obs);
          navigate("/Cartocor/pautas");
        }
      }
    } catch (error) {
      console.error("Error canceling order:", error);
      alert("Error al cancelar la orden. Por favor, inténtalo de nuevo.");
    }
  };

  // set_task_obs_supervisor(order.active, taskId, newObs)
  const addObsToTask = (taskId, newObs) => {
    if (!pautaDetails) return;
    set_task_obs_supervisor(order.active, taskId, newObs)
      .then(() => {
        // Actualizar el estado local para reflejar el cambio inmediatamente
        const updatedTasks = dataDict.Tareas.map((task) =>
          task.id === taskId ? { ...task, obs_supervisor: newObs } : task
        );
        fetchPautas();
      })
      .catch((error) => {
        console.error(
          "Error al actualizar las observaciones de la tarea:",
          error
        );
      });
  };

  useEffect(() => {
    if (!pautaDetails) return;
    setObs(pautaDetails.orden.obs_orden || "");
    setPriority(pautaDetails.orden.prioridad || "");
    setMantenedor(pautaDetails.orden.assigned_to || "");
  }, [pautaDetails]);

  async function handleAssign(pautaCode, mantenedorCode, obs, priority) {
    if (pautaCode && mantenedorCode) {
      priority = parseInt(priority, 10) || null; // Asegurar que priority sea un número
      await assignPauta(pautaCode, mantenedorCode, obs, priority)
        .then(fetchPautas())
        .catch((error) => {
          console.error("Error al asignar la pauta:", error);
        });
    } else {
      alert("Por favor, seleccione una pauta y un mantenedor.");
    }
  }
  const formatTime = (time) => {
    if (!time) return "N/A";
    const date = new Date(time);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (!pautaDetails) {
    return (
      <div className={styles.loading}>Cargando detalles de la pauta...</div>
    );
  }

  return (
    <div className={styles.container}>
      {order.anexosActive && (
        <div className={styles.popupOverlay}>
          <PopupAnexos />
        </div>
      )}
      <div className={styles.top}>
        <div className={styles.orden}>
          ORDEN: {pautaDetails.orden.code || "No disponible"}
        </div>
        <div className={styles.tarea}>
          TAREAS: {pautaDetails.orden.task_number || "No disponible"}
        </div>
        <div className={styles.timeTotal}>
          Tiempo: {pautaDetails.orden.horas_estimadas || "No disponible"}
        </div>
      </div>
      <div className={styles.detail}>
        <div className={styles.detail1}>
          Descripción: {dataDict.Descripcion || "N/A"}
          <br />
          N° Unidad: {dataDict["N Unidad"] || "N/A"}
          <br />
          Especialidad : {dataDict["Especialidad"] || "N/A"}
          <br />
          Originador : {dataDict["Originador"] || "N/A"}
          <br />
          Linea : {dataDict["Linea"] || "N/A"}
          <br />
          N° Serie : {dataDict["N de Serie"] || "N/A"}
          <br />
          Clase : {dataDict["Clase"] || "N/A"}
          <br />
          Tipo : {dataDict["Tipo"] || "N/A"}
          <br />
          Parte : {dataDict["Parte"] || "N/A"}
          <br />
          Elemento : {dataDict["Elemento"] || "N/A"}
          <br />
          Modo : {dataDict["Modo"] || "N/A"}
          <br />
          Incidencia : {dataDict["Incidencia"] || "N/A"}
          <br />
          Kit de Tareas : {dataDict["Kit de Tareas"] || "N/A"}
          <br />
          Planta : {dataDict["Planta"] || "N/A"}
          <br />
        </div>
        <div className={styles.detail2}>
          Asignado a:{" "}
          {pautaDetails.assigned_to_name !== null
            ? pautaDetails.orden.assigned_to +
              " " +
              pautaDetails.assigned_to_name
            : "N/A"}
          <br />
          Estado: {dataDict["Estado"] || "N/A"}
          <br />F inicial: {formatTime(dataDict["F inicial"]) || "N/A"}
          <br />F Real Ejecucion:{" "}
          {formatTime(dataDict["F Real Ejecucion"]) || "N/A"}
          <br />F Venc.: {formatTime(dataDict["Fecha Venc."]) || "N/A"}
          <br />
          Proximo Venc.: {formatTime(dataDict["Proximo Venc."]) || "N/A"}
          <br />
          Tipo de Servicio: {dataDict["Tipo servici"] || "N/A"}
          <br />
          Frec. Dias: {dataDict["Frec. Dias"] || "N/A"}
          <br />
          Frec. Comb.: {dataDict["Frec. Comb."] || "N/A"}
          <br />
          Frec. Km: {dataDict["Frec. Km"] || "N/A"}
          <br />
          Frec. Horas: {dataDict["Frec. Horas"] || "N/A"}
          <br />
          Ultima Realiz.: {formatTime(dataDict["Ultima Realiz."]) || "N/A"}
          <br />
          Fecha Prox Emision:{" "}
          {formatTime(dataDict["Fecha Prox Emision"]) || "N/A"}
          <br />
          Prioridad : {dataDict["Prioridad"] || "N/A"}
          <br />
        </div>
      </div>
      <div className={styles.additionalInfo}>
        <span>
          Seg. y Medio Ambiente : {dataDict["Seg. y Medio Ambiente"] || "N/A"}
        </span>
        <span>Calidad : {dataDict["Calidad"] || "N/A"}</span>
        <span>Operación : {dataDict["Operacion"] || "N/A"}</span>
        <span>Mantenimiento : {dataDict["Mantenimiento"] || "N/A"}</span>
        <span>Categorización : {dataDict["Categorizacion"] || "N/A"}</span>
        <span>Tipo de Servicio : {dataDict["Tipo de Servicio"] || "N/A"}</span>
      </div>

      <div className={styles.assignedContainer}>
        <div className={styles.assignedBy}>
          <strong>Asignado por:</strong>{" "}
          {pautaDetails.orden.assigned_by +
            " " +
            pautaDetails.assigned_by_name || "Sin Asignar"}
        </div>
        <div>
          <strong>Asignado a:</strong>
          <select
            name="assigned_to"
            id={pautaDetails.orden.code + "-assigned-to"}
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
          <strong>Prioridad:</strong>
          <select
            name="priority"
            id={pautaDetails.orden.code + "-priority"}
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

        <div className={styles.obsContainer}>
          <strong>Observaciones:</strong>
          <textarea
            id={pautaDetails.orden.code + "-obs"}
            placeholder="Ingrese observaciones..."
            className={styles.obsInput}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>
        <div className={styles.buttonsContainer}>
          {pautaDetails.status === 2 ? (
            <button className={styles.assignButton} disabled={true}>
              Completada
            </button>
          ) : pautaDetails.status === 3 ? (
            <button className={styles.assignButton} disabled={true}>
              Orden Anulada
            </button>
          ) : (
            <button
              className={styles.assignButton}
              onClick={() =>
                handleAssign(pautaDetails.orden.code, mantenedor, obs, priority)
              }
              disabled={mantenedor ? false : true}
            >
              Asignar Pauta
            </button>
          )}

          <button
            className={styles.viewButton}
            onClick={() => {
              setOrder({
                ...order,
                anexosActive: true,
                anexos: dataDict.Protocolos,
              });
            }}
          >
            Ver Anexos
          </button>

          {pautaDetails.status !== 3 && (
            <button
              className={styles.cancelButton}
              onClick={() => {
                handleCancelOrder();
              }}
            >
              Anular Orden
            </button>
          )}
        </div>
      </div>

      {dataDict.Tareas && (
        <div className={styles.tasksList}>
          <div className={styles.tableContainer}>
            <table className={styles.tasksTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Taller</th>
                  <th>Descripción</th>
                  <th>Tiempo</th>
                  <th>observacion</th>
                </tr>
              </thead>
              <tbody>
                {dataDict.Tareas.map((task, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{task.Taller || "-"}</td>
                    <td>{task.Descripcion || "-"}</td>
                    <td>{task["Hs Estim"] || "-"}</td>
                    <td>
                      <button
                        className={styles.obsButton}
                        disabled={
                          pautaDetails.orden.status === 2 ||
                          pautaDetails.orden.status === 3
                        }
                        onClick={() => {
                          const userConfirmed = window.confirm(
                            "¿Desea agregar o modificar las observaciones para esta tarea?"
                          );
                          if (userConfirmed) {
                            const newObs = window.prompt(
                              "Ingrese las observaciones:",
                              listTareas.find(
                                (t) => t.task_number === index + 1
                              )?.obs_assigned_by || ""
                            );
                            if (newObs !== null) {
                              addObsToTask(index + 1, newObs);
                              alert(
                                `Observaciones para la tarea ${
                                  index + 1
                                } actualizadas a: ${newObs}`
                              );
                            }
                          }
                        }}
                      >
                        {listTareas.some(
                          (t) =>
                            t.task_number === index + 1 &&
                            t.obs_assigned_by !== ""
                        )
                          ? "Editar \n Observación"
                          : "Agregar \n Observación"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detalle;
