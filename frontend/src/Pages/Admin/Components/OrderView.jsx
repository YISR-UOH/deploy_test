import React, { useState, useEffect, useRef } from "react";
import styles from "./View.module.css";
import { useContext } from "react";
import { ServerContext } from "../../../Context/ServerContext";

const OrderView = () => {
  const { getOrden, uploadFile } = useContext(ServerContext);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filter, setFilter] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrden();
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
      setOrders([]);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, [getOrden]);

  const onChooseFileClick = () => {
    setUploadError("");
    setUploadSuccess("");
    fileInputRef.current?.click();
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleUploadClick = async () => {
    if (!selectedFile) {
      setUploadError("Selecciona un archivo (.pdf) primero.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      await uploadFile(selectedFile);
      setUploadSuccess("Archivo subido correctamente.");
      setSelectedFile(null);
      setSelectedFileName("");
      // refrescar órdenes después de la subida
      fetchOrders();
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError("No se pudo subir el archivo. Intenta nuevamente.");
    } finally {
      setUploading(false);
      // limpiar el input para permitir seleccionar el mismo archivo otra vez si se desea
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    setFilter(orders || []);
  }, [orders]);

  const handleEdit = (order) => {
    if (isEditing && selectedOrder === order.code) {
      setIsEditing(false);
      setSelectedOrder(null);
      setEditForm({});
    } else {
      setSelectedOrder(order.code);
      setIsEditing(true);
      setEditForm({
        description: order.description || "",
        unit_number: order.unit_number || "",
      });
    }
  };

  const handleSave = () => {
    // TODO: Implement save functionality with API call
    setIsEditing(false);
    setSelectedOrder(null);
    setEditForm({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedOrder(null);
    setEditForm({});
  };

  const handleDelete = (orderId) => {
    // TODO: Implement delete functionality with API call
    console.log("Eliminar orden", orderId);
  };

  const handleFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className={styles.usersContainer}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar orden por descripción o número de unidad..."
          className={styles.searchInput}
          onChange={(e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredOrders = orders.filter(
              (order) =>
                order.description?.toLowerCase().includes(searchTerm) ||
                order.unit_number?.toLowerCase().includes(searchTerm)
            );
            setFilter(filteredOrders);
          }}
        />
        <div className={styles.uploadContainer}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={onFileSelected}
            className={styles.visuallyHiddenInput}
          />
          <button
            type="button"
            className={styles.Button}
            onClick={onChooseFileClick}
            disabled={uploading}
            title="Elegir archivo (.pdf)"
          >
            {uploading ? "Procesando..." : "Elegir archivo"}
          </button>
          <span
            className={styles.fileName}
            title={selectedFileName || "Ningún archivo seleccionado"}
          >
            {selectedFileName || "Ningún archivo seleccionado"}
          </span>
          <button
            type="button"
            className={styles.Button}
            onClick={handleUploadClick}
            disabled={!selectedFile || uploading}
            title="Subir archivo seleccionado"
          >
            {uploading ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </div>
      {(uploadError || uploadSuccess) && (
        <div className={styles.uploadStatus}>
          {uploadError && (
            <span className={styles.errorText}>{uploadError}</span>
          )}
          {uploadSuccess && (
            <span className={styles.successText}>{uploadSuccess}</span>
          )}
        </div>
      )}
      {loading && <p>Cargando órdenes...</p>}
      {orders.length === 0 && !loading && <p>No hay órdenes disponibles</p>}
      {filter.length > 0 &&
        filter.map((order) => (
          <div key={order.code} className={styles.userCard}>
            <div className={styles.userInfo}>
              <div>
                <span>Numero de Orden</span>
                <span>
                  <input
                    type="text"
                    value={
                      isEditing && selectedOrder === order.code
                        ? editForm.code
                        : order.code || ""
                    }
                    placeholder={order.code || "Numero de Orden"}
                    disabled={!(isEditing && selectedOrder === order.code)}
                    onChange={(e) => handleFormChange("code", e.target.value)}
                  />
                </span>
              </div>
              <div>
                <span>Tiempo Estimado</span>
                <span>
                  <input
                    type="text"
                    value={
                      isEditing && selectedOrder === order.code
                        ? editForm.horas_estimadas
                        : order.horas_estimadas || ""
                    }
                    placeholder={order.horas_estimadas || "Tiempo Estimado"}
                    disabled={!(isEditing && selectedOrder === order.code)}
                    onChange={(e) =>
                      handleFormChange("horas_estimadas", e.target.value)
                    }
                  />
                </span>
              </div>
            </div>

            <div className={styles.userActions}>
              {!isEditing || selectedOrder !== order.code ? (
                <button
                  className={styles.Button}
                  onClick={() => handleEdit(order)}
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
                onClick={() => handleDelete(order.code)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
    </div>
  );
};

export default OrderView;
