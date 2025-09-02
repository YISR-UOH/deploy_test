import styles from "./Pautas.module.css";
import { useState, useEffect, useMemo } from "react";
import { useContext } from "react";
import { ServerContext } from "../../Context/ServerContext";
import { PopupAnexos } from "./Components/Anexos";
import { UserContext } from "../../Context/UserContext";
import PautaItem from "./Components/Supervisor/PautaItem";

const Pautas = () => {
  const { getOrden, getMantenedores, assignPauta } = useContext(ServerContext);
  const { order } = useContext(UserContext);
  const [pautas, setPautas] = useState([]);
  const [mantenedores, setMantenedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const fetchPautas = async () => {
    try {
      const data = await getOrden();
      console.log("Pautas cargadas:", data);
      setPautas(data);
      const mantenedoresData = await getMantenedores();
      setMantenedores(mantenedoresData);
    } catch (error) {
      console.error("Error al cargar las pautas:", error);
    }
  };
  useEffect(() => {
    fetchPautas();
  }, []);

  const filteredPautas = useMemo(() => {
    let result = pautas;
    if (filterType === "assigned") {
      result = result.filter((pauta) => pauta.assigned_to);
    } else if (filterType === "unassigned") {
      result = result.filter((pauta) => !pauta.assigned_to);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (pauta) =>
          pauta.code?.toString().toLowerCase().includes(term) ||
          pauta.descripcion?.toLowerCase().includes(term) ||
          pauta.horas_estimadas?.toString().toLowerCase().includes(term) ||
          pauta.task_number?.toString().toLowerCase().includes(term) ||
          (pauta.tareas &&
            pauta.tareas.some((task) =>
              task.Descripcion?.toLowerCase().includes(term)
            ))
      );
    }
    setCurrentPage(1);
    return result;
  }, [pautas, searchTerm, filterType]);

  // Calcular páginas
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredPautas.length / pageSize));
  }, [filteredPautas.length]);

  const currentPageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPautas.slice(start, start + pageSize);
  }, [filteredPautas, currentPage]);

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  async function handleAssign(pautaCode, mantenedorCode, obs, priority) {
    if (!pautaCode || !mantenedorCode) {
      alert("Por favor, seleccione una pauta y un mantenedor.");
      return;
    }
    try {
      const parsedPriority = parseInt(priority, 10) || null;
      await assignPauta(pautaCode, mantenedorCode, obs, parsedPriority);
      await fetchPautas();
    } catch (error) {
      console.error("Error al asignar la pauta:", error);
      alert("Ocurrió un error al asignar la pauta.");
    }
  }

  return (
    <div className={styles.pautasContainer}>
      {order.anexosActive && (
        <div className={styles.popupOverlay}>
          <PopupAnexos />
        </div>
      )}
      <div className={styles.topBar}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar pautas..."
            className={styles.searchInput}
            onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
          <div className={styles.filterContainer}>
            <select
              id="filter"
              className={styles.selectInput}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="assigned">Asignadas</option>
              <option value="unassigned">No Asignadas</option>
            </select>
          </div>
        </div>
        {filteredPautas.length > pageSize ? (
          <div className={styles.pager}>
            <button
              className={styles.pagerButton}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Anterior"
            >
              ←
            </button>
            <span className={styles.pagerInfo}>
              {currentPage} / {totalPages}
            </span>
            <button
              className={styles.pagerButton}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Siguiente"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.contentContainer}>
        {pautas ? (
          currentPageData.length > 0 ? (
            currentPageData.map((pauta) => (
              <div key={pauta.code} className={styles.pautaCard}>
                <PautaItem
                  pauta={pauta}
                  mantenedores={mantenedores}
                  onAssign={handleAssign}
                />
              </div>
            ))
          ) : (
            <div className={styles.loading}>No hay pautas para mostrar.</div>
          )
        ) : (
          <div className={styles.loading}>Cargando pautas...</div>
        )}
      </div>
    </div>
  );
};

export default Pautas;
