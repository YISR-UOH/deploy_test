import { useState, useEffect, useContext } from "react";
import { UserContext } from "../../../Context/UserContext.jsx";
import { ServerContext } from "../../../Context/ServerContext.jsx";
import CheckList from "./CheckList/CheckList.jsx";
import styles from "./StatOrden.module.css";

const StatOrden = ({ close }) => {
  const { order, setOrder } = useContext(UserContext);
  const { get_order_with_data } = useContext(ServerContext);
  const [dataDict, setDataDict] = useState({});
  const [pautaDetails, setPautaDetails] = useState(null);
  const [dataTask, setDataTask] = useState(null);
  const [viewChecklist, setViewChecklist] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      if (order && order.active) {
        const data = await get_order_with_data(order.active);
        console.log("Data fetched for order:", data);
        setDataDict(data.orden.data.data);
        setPautaDetails(data);
        setDataTask(data.tasks);
      }
    };
    fetchData();
  }, [order, get_order_with_data]);

  const toggleChecklist = () => {
    console.log(pautaDetails.orden.checkListDict);
    setViewChecklist(!viewChecklist);
  };
  if (!pautaDetails) {
    return <div>Cargando detalles de la orden...</div>;
  }

  return (
    <div className={styles.statContainer}>
      {viewChecklist && (
        <div className={styles.checklistOverlay}>
          <CheckList
            cancel={toggleChecklist}
            data={pautaDetails.orden.checkListDict}
          />
        </div>
      )}
      <h2>Orden: {pautaDetails.orden.code}</h2>
      <p>
        Estado: {pautaDetails.orden.status + " - "}
        {pautaDetails.orden.status === 2
          ? "Finalizada"
          : pautaDetails.orden.status === 3
          ? "Cancelada"
          : pautaDetails.orden.status === 1
          ? "En Proceso"
          : "Pendiente"}
      </p>
      {pautaDetails.orden.status === 3 && (
        <p>Motivo de Cancelación: {pautaDetails.orden.obs_orden_cancelada}</p>
      )}
      <p>
        Realizada por:{" "}
        {pautaDetails.orden.assigned_to + " " + pautaDetails.assigned_to_name}
      </p>
      {pautaDetails.orden.checkListDict && (
        <p>
          Checklist:{" "}
          {pautaDetails.orden.checkListDict.supervisor.firma
            ? "Completado"
            : "Pendiente"}
        </p>
      )}
      <button onClick={() => toggleChecklist()} className={styles.button}>
        revisar CheckList
      </button>
      <button onClick={() => close()} className={styles.button}>
        Cerrar
      </button>
    </div>
  );
};

export default StatOrden;
