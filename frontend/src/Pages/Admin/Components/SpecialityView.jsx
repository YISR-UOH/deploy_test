import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./View.module.css";
import { ServerContext } from "../../../Context/ServerContext.jsx";
import { useContext } from "react";

const SpecialityView = () => {
  const { editSpeciality, getSpeciality } = useContext(ServerContext);
  const [selectedSpeciality, setSelectedSpeciality] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editForm, setEditForm] = useState({});
  const [specialities, setSpecialities] = useState([]);

  const fetchSpecialities = useCallback(async () => {
    const data = await getSpeciality();
    setSpecialities(data || []);
  }, [getSpeciality]);

  useEffect(() => {
    fetchSpecialities();
  }, [fetchSpecialities]);

  const handleEdit = useCallback(
    (specialityCode) => {
      if (isEditing && selectedSpeciality === specialityCode) {
        setIsEditing(false);
        setSelectedSpeciality(null);
        setEditForm({});
      } else {
        setSelectedSpeciality(specialityCode);
        setIsEditing(true);
        setEditForm({});
      }
    },
    [isEditing, selectedSpeciality]
  );

  const handleSave = useCallback(async () => {
    await editSpeciality(selectedSpeciality, editForm);
    await fetchSpecialities();
    setIsEditing(false);
    setSelectedSpeciality(null);
    setEditForm({});
  }, [selectedSpeciality, editForm, editSpeciality, fetchSpecialities]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setSelectedSpeciality(null);
    setEditForm({});
  }, []);

  const handleDelete = useCallback((specialityId) => {
    console.log("Eliminar especialidad", specialityId);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const filteredSpecialities = useMemo(() => {
    if (!searchTerm) return specialities;
    return specialities.filter(
      (speciality) =>
        speciality.nombre.toLowerCase().includes(searchTerm) ||
        speciality.descripcion.toLowerCase().includes(searchTerm) ||
        speciality.code.toString().includes(searchTerm)
    );
  }, [specialities, searchTerm]);

  if (!specialities || specialities.length === 0) {
    return (
      <div className={styles.usersContainer}>
        <p>No hay especialidades disponibles</p>
      </div>
    );
  }

  return (
    <div className={styles.usersContainer}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar especialidad..."
          className={styles.searchInput}
          onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
        />
      </div>
      {filteredSpecialities.map((speciality) => (
        <div key={speciality.code} className={styles.userCard}>
          <div className={styles.userInfo}>
            <div>
              <span>Codigo de Especialidad</span>
              <span>
                <input
                  type="text"
                  value={speciality.code}
                  placeholder={speciality.code || "Codigo especialidad"}
                  disabled={true}
                />
              </span>
            </div>
            <div>
              <span>Nombre</span>
              <span>
                <input
                  type="text"
                  value={
                    isEditing && selectedSpeciality === speciality.code
                      ? editForm.nombre
                      : speciality.nombre
                  }
                  placeholder={speciality.nombre || "nombre"}
                  disabled={
                    !(isEditing && selectedSpeciality === speciality.code)
                  }
                  onChange={(e) => handleFormChange("nombre", e.target.value)}
                />
              </span>
            </div>
            <div>
              <span>Descripcion</span>
              <span>
                <input
                  type="text"
                  value={
                    isEditing && selectedSpeciality === speciality.code
                      ? editForm.descripcion
                      : speciality.descripcion
                  }
                  placeholder={speciality.descripcion || "descripcion"}
                  disabled={
                    !(isEditing && selectedSpeciality === speciality.code)
                  }
                  onChange={(e) =>
                    handleFormChange("descripcion", e.target.value)
                  }
                />
              </span>
            </div>
          </div>

          <div className={styles.userActions}>
            {!isEditing || selectedSpeciality !== speciality.code ? (
              <button
                className={styles.Button}
                onClick={() => handleEdit(speciality.code)}
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  className={`${styles.Button} ${styles.success}`}
                  onClick={handleSave}
                >
                  Guardar
                </button>
                <button
                  className={`${styles.Button} ${styles.warning}`}
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
              </>
            )}

            <button
              className={`${styles.Button} ${styles.error}`}
              onClick={() => handleDelete(speciality.code)}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SpecialityView;
