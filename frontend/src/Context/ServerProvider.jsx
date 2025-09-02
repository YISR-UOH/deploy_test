import { apiClient, setAuthToken } from "../Utils/apiClient";
import { useState, useEffect, useContext } from "react";
import { ServerContext } from "./ServerContext";
import { UserContext } from "./UserContext";

class Server {
  constructor(token = null) {
    this.token = token;
  }
}

export const ServerProvider = ({ children }) => {
  const [server, setServer] = useState(new Server());
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (user.token) setAuthToken(user.token);
  }, [user.token]);

  return (
    <ServerContext.Provider
      value={{
        server,
        setServer,
        login,
        getUsers,
        editUser,
        addUser,
        editSpeciality,
        getSpeciality,
        getOrden,
        getMantenedores,
        assignPauta,
        getPauta,
        uploadFile,
        start_task,
        finish_task,
        getTasks,
        getSummary,
        checkAuthentication,
        set_task_obs_supervisor,
        set_task_obs_mantenedor,
        list_tareas,
        cancel_order,
        update_checklist,
        get_order_with_data,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

const waitForServer = async () => {
  while (true) {
    try {
      await apiClient.get("/auth/check");
      break; // Exit loop if server is reachable
    } catch (error) {
      console.error("Server not reachable, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retrying
    }
  }
};

async function assignPauta(pautaId, mantenedorId, obs, priority) {
  try {
    await waitForServer();
    const response = await apiClient.patch(`/ordenes/${pautaId}/assign`, {
      assigned_to: mantenedorId,
      obs_orden: obs,
      prioridad: priority,
    });
    return response.data;
  } catch (error) {
    console.error("Error asignando pauta:", error);
    throw error;
  }
}

async function login(username, password) {
  try {
    const response = await apiClient.post("/auth/login", {
      code: username,
      password: password,
    });
    const data = response.data;
    return data;
  } catch (error) {
    console.error("Login failed:", error);
  }
}

async function getUsers() {
  try {
    await waitForServer();
    const response = await apiClient.get("/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

async function editUser(userId, userData) {
  try {
    const response = await apiClient.patch(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error("Error editing user:", error);
    throw error;
  }
}

async function addUser(payload) {
  try {
    const response = await apiClient.post("/users", {
      code: payload.code,
      nombre: payload.nombre,
      password: payload.password,
      tipo_usuario_id: payload.tipo_usuario_id,
      especialidad_id: payload.especialidad_id,
      estado: payload.estado,
      theme: payload.theme,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
}

async function getSpeciality() {
  try {
    await waitForServer();
    const response = await apiClient.get("/especialidades");
    return response.data;
  } catch (error) {
    console.error("Error fetching specialities:", error);
    return [];
  }
}

async function editSpeciality(specialityId, specialityData) {
  try {
    apiClient
      .patch(`/especialidades/${specialityId}`, specialityData)
      .then((response) => {
        return response.data;
      });
  } catch (error) {
    console.error("Error editing speciality:", error);
  }
}

async function getOrden() {
  try {
    await waitForServer();
    const response = await apiClient.get("/ordenes");
    return response.data;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

async function getMantenedores() {
  try {
    await waitForServer();
    const response = await apiClient.get("/users/getMantenedores");
    return response.data;
  } catch (error) {
    console.error("Error fetching maintainers:", error);
    return [];
  }
}

async function getPauta(pautaId) {
  try {
    await waitForServer();
    const response = await apiClient.get(`/ordenes/${pautaId}`);
    return response.data;
  } catch (error) {
    console.error("Error asignando pauta:", error);
    throw error;
  }
}

async function uploadFile(file) {
  try {
    await waitForServer();
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post("/ordenes/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// @router.patch("/{code}/tareas/{task_number}/start")

async function start_task(orderCode, taskId) {
  try {
    const response = await apiClient.patch(
      `/ordenes/${orderCode}/tareas/${taskId}/start`
    );
    return response.data;
  } catch (error) {
    console.error("Error starting task:", error);
    throw error;
  }
}

/*
@router.patch("/{code}/tareas/{task_number}/finish")
async def finish_task(
    code: int,
    task_number: int,
    payload: TaskFinishIn | None = None,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
*/

async function finish_task(orderCode, taskId, form) {
  try {
    const body = form ? { data: form } : {};
    const response = await apiClient.patch(
      `/ordenes/${orderCode}/tareas/${taskId}/finish`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error finishing task:", error);
    throw error;
  }
}

// @router.get("/{code}/tareas", response_model=list[TaskOut])
async function getTasks(orderCode) {
  try {
    await waitForServer();
    const response = await apiClient.get(`/ordenes/${orderCode}/tareas`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

// @router.get("/summary")
async function getSummary() {
  try {
    await waitForServer();
    const response = await apiClient.get("/ordenes/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching summary:", error);
    return [];
  }
}

// @router.get("/check") authentication check
async function checkAuthentication() {
  try {
    const response = await apiClient.get("/auth/check");
    return response.data;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/*
@router.patch("/{code}/tareas/{task_number}/obs/supervisor")
async def set_task_obs_supervisor(
    code: int,
    task_number: int,
    payload: TaskObsIn,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
*/
async function set_task_obs_supervisor(orderCode, taskId, obs) {
  try {
    const body = obs ? { obs: obs } : {};
    const response = await apiClient.patch(
      `/ordenes/${orderCode}/tareas/${taskId}/obs/supervisor`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error setting supervisor observations:", error);
    throw error;
  }
}

/*
@router.patch("/{code}/tareas/{task_number}/obs/mantenedor")
async def set_task_obs_mantenedor(
    code: int,
    task_number: int,
    payload: TaskObsIn,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
*/
async function set_task_obs_mantenedor(orderCode, taskId, obs) {
  try {
    const body = obs ? { obs: obs } : {};
    const response = await apiClient.patch(
      `/ordenes/${orderCode}/tareas/${taskId}/obs/mantenedor`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error setting maintainer observations:", error);
    throw error;
  }
}

/*
@router.get("/{code}/tareas", response_model=list[TaskOut])
async def list_tareas(
    code: int,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
*/
async function list_tareas(orderCode) {
  try {
    await waitForServer();
    const response = await apiClient.get(`/ordenes/${orderCode}/tareas`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

/*
# cancel order, las tareas que no estén completadas se cancelan, supervisor y mantenedor pueden cancelar
@router.delete("/{code}")
async def cancel_order(
    code: int,
    payload: str | None = None,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),

    async function update_checklist(orderCode, reason, token) { 
      const res = await axios.delete(/ordenes/${orderCode}, { params: reason ? { payload: reason } : {},  }); 
      return res.data; }
*/

async function cancel_order(orderCode, reason) {
  try {
    const response = await apiClient.delete(`/ordenes/${orderCode}`, {
      params: { payload: reason },
    });
    return response.data;
  } catch (error) {
    console.error("Error canceling order:", error);
    throw error;
  }
}
/*
@router.get("/{code}", response_model=OrdenOutWithData)
async def get_order_with_data(
    code: int,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
*/
async function get_order_with_data(orderCode) {
  try {
    await waitForServer();
    const response = await apiClient.get(`/ordenes/${orderCode}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching order with data:", error);
    throw error;
  }
}
/*
@router.patch("/{code}/checklist")
async def update_checklist(
    code: int,
    payload: dict[str, Any],
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
)
*/
async function update_checklist(orderCode, payload) {
  try {
    const response = await apiClient.patch(
      `/ordenes/${orderCode}/checklist`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error updating checklist:", error);
    throw error;
  }
}
