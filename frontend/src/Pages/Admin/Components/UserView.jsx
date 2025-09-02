import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./View.module.css";
import { ServerContext } from "../../../Context/ServerContext.jsx";
import { useContext } from "react";
import { UserContext } from "../../../Context/UserContext.jsx";

const UserView = () => {
  const { getUsers, addUser, editUser } = useContext(ServerContext);
  const { setNotifyData } = useContext(UserContext);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newUserForm, setNewUserForm] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (e) {
      setNotifyData({
        title: "Error",
        message: "No se pudieron cargar los usuarios.",
        type_notification: "error",
        duration: 3000,
        active: true,
      });
    }
  }, [getUsers, setNotifyData]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = useCallback(
    (user) => {
      if (isEditing && selectedUser === user.code) {
        setIsEditing(false);
        setSelectedUser(null);
        setEditForm({});
      } else {
        setSelectedUser(user.code);
        setIsEditing(true);
        setEditForm({
          nombre: user.nombre,
          password: "",
          especialidad_id: user.especialidad_id,
          tipo_usuario_id: user.tipo_usuario_id,
        });
      }
    },
    [isEditing, selectedUser]
  );

  const handleSave = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await editUser(selectedUser, editForm);
      await fetchUsers();
      setNotifyData({
        title: "Éxito",
        message: "Usuario actualizado correctamente.",
        type_notification: "success",
        duration: 2500,
        active: true,
      });
    } catch (e) {
      setNotifyData({
        title: "Error",
        message: "No se pudo actualizar el usuario.",
        type_notification: "error",
        duration: 3000,
        active: true,
      });
    } finally {
      setIsEditing(false);
      setSelectedUser(null);
      setEditForm({});
    }
  }, [selectedUser, editUser, editForm, fetchUsers, setNotifyData]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setSelectedUser(null);
    setEditForm({});
    setNotifyData({
      title: "Cancelado",
      message: "Edición cancelada.",
      type_notification: "info",
      duration: 2000,
      active: true,
    });
  }, [setNotifyData]);
  const handleAdd = useCallback(() => {
    setShowAddModal(true);
    // initialize with defaults to avoid spreading null
    setNewUserForm({
      code: "",
      nombre: "",
      password: "",
      tipo_usuario_id: 0,
      especialidad_id: 0,
      estado: 1,
      theme: 0,
    });
  }, []);

  const isNewUserInvalid = useMemo(() => {
    if (!newUserForm) return true;
    const { code, nombre, password, tipo_usuario_id, especialidad_id } =
      newUserForm;
    if (nombre.trim() === "" || password.trim() === "" || code === "")
      return true;
    if (Number.isNaN(Number(code))) return true;
    if (tipo_usuario_id === null || tipo_usuario_id === "") return true;
    if (especialidad_id === null || especialidad_id === "") return true;
    return false;
  }, [newUserForm]);

  const handleAddUser = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newUserForm || isNewUserInvalid) {
        setNotifyData({
          title: "Campos incompletos",
          message: "Completa todos los campos antes de guardar.",
          type_notification: "warning",
          duration: 2500,
          active: true,
        });
        return;
      }
      try {
        const created = await addUser(newUserForm);
        if (created && created.code) {
          setUsers((prev) =>
            prev.some((u) => u.code === created.code)
              ? prev
              : [...prev, created]
          );
        } else {
          await fetchUsers();
        }
        setNotifyData({
          title: "Éxito",
          message: "Usuario agregado correctamente.",
          type_notification: "success",
          duration: 2500,
          active: true,
        });
        setShowAddModal(false);
        setNewUserForm(null);
      } catch (err) {
        console.error("Error adding user:", err);
        setNotifyData({
          title: "Error",
          message: "No se pudo agregar el usuario.",
          type_notification: "error",
          duration: 3000,
          active: true,
        });
      }
    },
    [addUser, newUserForm, isNewUserInvalid, fetchUsers, setNotifyData]
  );

  const handleCancelAdd = useCallback(() => {
    setShowAddModal(false);
    setNewUserForm(null);
    setNotifyData({
      title: "Cancelado",
      message: "Creación de usuario cancelada.",
      type_notification: "info",
      duration: 2000,
      active: true,
    });
  }, [setNotifyData]);
  const handleDelete = useCallback((userId) => {
    // TODO: Implement delete functionality with API call
    console.log("Eliminar usuario", userId);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(
      (user) =>
        user.nombre.toLowerCase().includes(searchTerm) ||
        user.code.toString().includes(searchTerm)
    );
  }, [users, searchTerm]);

  if (!users || users.length === 0) {
    return (
      <div className={styles.usersContainer}>
        <p>No hay usuarios disponibles</p>
      </div>
    );
  }

  return (
    <div className={styles.usersContainer}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar usuario por nombre o código..."
          className={styles.searchInput}
          onChange={(e) => {
            setSearchTerm(e.target.value.toLowerCase());
          }}
        />

        <div className={styles.addUserButton}>
          <button className={styles.Button} onClick={handleAdd}>
            Agregar Usuario
          </button>
        </div>
      </div>
      {filteredUsers.map((user) => (
        <div key={user.code} className={styles.userCard}>
          <div className={styles.userInfo}>
            <div>
              <span>Nombre de Usuario</span>
              <span>
                <input
                  type="text"
                  value={
                    isEditing && selectedUser === user.code
                      ? editForm.nombre
                      : user.nombre
                  }
                  placeholder={user.nombre}
                  disabled={!(isEditing && selectedUser === user.code)}
                  onChange={(e) => handleFormChange("nombre", e.target.value)}
                />
              </span>
            </div>
            <div>
              <span>Código de Usuario</span>
              <span>
                <input
                  type="text"
                  value={user.code}
                  placeholder={user.code}
                  disabled={true}
                />
              </span>
            </div>
            <div>
              <span>Contraseña</span>
              <span>
                <input
                  type="password"
                  value={
                    isEditing && selectedUser === user.code
                      ? editForm.password
                      : ""
                  }
                  placeholder={
                    isEditing && selectedUser === user.code
                      ? "Nueva contraseña"
                      : "••••••••"
                  }
                  disabled={!(isEditing && selectedUser === user.code)}
                  onChange={(e) => handleFormChange("password", e.target.value)}
                />
              </span>
            </div>
            <div>
              <span>Especialidad</span>
              <span>
                {isEditing && selectedUser === user.code ? (
                  <select
                    value={editForm.especialidad_id}
                    onChange={(e) =>
                      handleFormChange(
                        "especialidad_id",
                        parseInt(e.target.value)
                      )
                    }
                    className={styles.selectInput}
                    defaultValue={user.especialidad_id}
                  >
                    <option value={0}>Administrador</option>
                    <option value={1}>Electrico</option>
                    <option value={2}>Mecanico</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={
                      user.especialidad_id === 0
                        ? "Administrador"
                        : user.especialidad_id === 1
                        ? "Electrico"
                        : "Mecanico"
                    }
                    disabled={true}
                  />
                )}
              </span>
            </div>
            <div>
              <span>Tipo de Usuario</span>
              <span>
                {isEditing && selectedUser === user.code ? (
                  <select
                    value={editForm.tipo_usuario_id}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tipo_usuario_id: parseInt(e.target.value),
                      }))
                    }
                    className={styles.selectInput}
                  >
                    <option value={0}>Administrador</option>
                    <option value={1}>Supervisor</option>
                    <option value={2}>Mantenedor</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={
                      user.tipo_usuario_id === 0
                        ? "Administrador"
                        : user.tipo_usuario_id === 1
                        ? "Supervisor"
                        : "Mantenedor"
                    }
                    disabled={true}
                  />
                )}
              </span>
            </div>
          </div>

          <div className={styles.userActions}>
            {!isEditing || selectedUser !== user.code ? (
              <button
                className={styles.Button}
                onClick={() => handleEdit(user)}
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
              onClick={() => handleDelete(user.code)}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Agregar Nuevo Usuario</h2>
            <form className={styles.addUserForm}>
              <div className={styles.formGroup}>
                <label>Nombre de Usuario:</label>
                <input
                  type="text"
                  value={newUserForm?.nombre || ""}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      nombre: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Código de Usuario:</label>
                <input
                  type="number"
                  value={newUserForm?.code}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      code:
                        e.target.value === "" ? "" : parseInt(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contraseña:</label>
                <input
                  type="password"
                  value={newUserForm?.password || ""}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Especialidad (ID):</label>
                <select
                  value={newUserForm?.especialidad_id}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      especialidad_id: parseInt(e.target.value),
                    }))
                  }
                  className={styles.selectInput}
                >
                  <option value={0}>Administrador</option>
                  <option value={1}>Electrico</option>
                  <option value={2}>Mecanico</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Tipo de Usuario:</label>
                <select
                  value={newUserForm?.tipo_usuario_id}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      tipo_usuario_id: parseInt(e.target.value),
                    }))
                  }
                  className={styles.selectInput}
                >
                  <option value={0}>Administrador</option>
                  <option value={1}>Supervisor</option>
                  <option value={2}>Mantenedor</option>
                </select>
              </div>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={`${styles.Button} ${styles.success}`}
                  onClick={handleAddUser}
                  disabled={isNewUserInvalid}
                  title={
                    isNewUserInvalid
                      ? "Completa todos los campos"
                      : "Guardar usuario"
                  }
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className={`${styles.Button} ${styles.warning}`}
                  onClick={handleCancelAdd}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserView;
