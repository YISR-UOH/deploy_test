import { createContext, useState, useEffect, useMemo, use } from "react";
import { apiClient, setAuthToken } from "../Utils/apiClient";

class User {
  constructor(
    name = "",
    code = "",
    user_type = "",
    specialty_id = "",
    authenticated = false,
    themePreference = "light",
    token = "",
    logout = false
  ) {
    this.name = name;
    this.code = code;
    this.user_type = user_type;
    this.specialty_id = specialty_id;
    this.authenticated = authenticated;
    this.themePreference = themePreference; // 'light' or 'dark'
    this.logout = logout;
    this.token = token; // JWT or session token
  }

  get isAuthenticated() {
    return this.authenticated;
  }

  setThemePreference() {
    this.themePreference = this.themePreference === "light" ? "dark" : "light";
  }

  get isAdmin() {
    return this.user_type === 0;
  }
  get isSupervisor() {
    return this.user_type === 1;
  }
  get isMaintainer() {
    return this.user_type === 2;
  }
}
class Order {
  constructor(
    active = null,
    countTotal = null,
    countAssigned = null,
    task_id = null,
    anexos = null,
    anexosActive = false
  ) {
    this.active = active;
    this.countTotal = countTotal;
    this.countAssigned = countAssigned;
    this.task_id = task_id;
    this.anexos = anexos;
    this.anexosActive = anexosActive;
  }

  get countAvailable() {
    return this.countTotal - this.countAssigned;
  }
  get isActive() {
    return this.active;
  }
  get taskId() {
    return this.task_id;
  }

  set isActive(value) {
    this.active = value;
  }
  set taskId(task_id) {
    this.task_id = task_id;
  }

  updateCounts(countTotal, countAssigned) {
    this.countTotal = countTotal;
    this.countAssigned = countAssigned;
  }
  updateActive(active) {
    this.active = active;
  }
}

class Task {
  constructor(
    task_id = null,
    order_id = null,
    data = null,
    protocolo = null,
    detalle_mant = null,
    name_supervisor = null,
    code_supervisor = null
  ) {
    this.task_id = task_id;
    this.order_id = order_id;
    this.data = data;
    this.protocolo = protocolo;
    this.detalle_mant = detalle_mant;
    this.name_supervisor = name_supervisor;
    this.code_supervisor = code_supervisor;
  }
}
class Chat {
  constructor(isOpen = false, msgCountUnread) {
    this.isOpen = isOpen;
    this.msgCountUnread = msgCountUnread;
  }
  toggleOpen() {
    this.isOpen = !this.isOpen;
  }
  setMsgCountUnread(count) {
    this.msgCountUnread = count;
  }
  get getIsOpen() {
    return this.isOpen;
  }
  get getMsgCountUnread() {
    return this.msgCountUnread;
  }
}
class Control {
  constructor(isLoading = false, isError = false, errorMessage = "") {
    this.isLoading = isLoading;
    this.isError = isError;
    this.errorMessage = errorMessage;
  }

  toggleLoading() {
    this.isLoading = !this.isLoading;
  }
  setError(errorMessage = "") {
    this.isError = true;
    this.errorMessage = errorMessage;
  }
  reset() {
    this.isLoading = false;
    this.isError = false;
    this.errorMessage = "";
  }
}
class NotifyData {
  constructor(
    title = "",
    message = "",
    type_notification = "",
    duration = 0,
    active = false
  ) {
    this.title = title;
    this.message = message;
    this.type_notification = type_notification;
    this.duration = duration;
    this.active = active;
  }
}

export const UserContext = createContext({
  user: new User(),
  order: new Order(),
  chat: new Chat(),
  control: new Control(),
  notifyData: new NotifyData(),
  task: new Task(),
});
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(
    sessionStorage.getItem("user")
      ? JSON.parse(sessionStorage.getItem("user"))
      : new User()
  );
  const [order, setOrder] = useState(
    sessionStorage.getItem("order")
      ? JSON.parse(sessionStorage.getItem("order"))
      : new Order()
  );
  const [chat, setChat] = useState(
    sessionStorage.getItem("chat")
      ? JSON.parse(sessionStorage.getItem("chat"))
      : new Chat()
  );
  const [control, setControl] = useState(
    sessionStorage.getItem("control")
      ? JSON.parse(sessionStorage.getItem("control"))
      : new Control()
  );
  const [notifyData, setNotifyData] = useState(
    sessionStorage.getItem("notifyData")
      ? JSON.parse(sessionStorage.getItem("notifyData"))
      : new NotifyData()
  );
  const [task, setTask] = useState(
    sessionStorage.getItem("task")
      ? JSON.parse(sessionStorage.getItem("task"))
      : new Task()
  );
  // Guardar en sessionStorage
  useEffect(() => {
    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("order", JSON.stringify(order));
    sessionStorage.setItem("chat", JSON.stringify(chat));
    sessionStorage.setItem("control", JSON.stringify(control));
    sessionStorage.setItem("notifyData", JSON.stringify(notifyData));
    sessionStorage.setItem("task", JSON.stringify(task));
    // Configurar token en cliente centralizado
    setAuthToken(user.token || null);
  }, [user, order, chat, control, notifyData, task]);

  useEffect(() => {
    if (user.token) setAuthToken(user.token);
  }, [user.token]);

  // sesionStorage
  // notificar cuando exista un error
  useEffect(() => {
    if (control.isError) {
      setNotifyData({
        title: "Error",
        message: control.errorMessage,
        type_notification: "error",
        duration: 3000,
        active: true,
      });
      setControl({
        ...control,
        isError: false,
        errorMessage: "",
      });
    }
  }, [control]);
  // logout true, eliminar todo el contexto
  useEffect(() => {
    if (user.logout) {
      setUser(new User());
      setOrder(new Order());
      setChat(new Chat());
      setControl(new Control());
      setNotifyData(new NotifyData());
      sessionStorage.clear();
      setAuthToken(null);
    }
  }, [user]);

  const contextValue = useMemo(
    () => ({
      user,
      setUser,
      order,
      setOrder,
      chat,
      setChat,
      control,
      setControl,
      notifyData,
      setNotifyData,
      task,
      setTask,
    }),
    [
      user,
      order,
      chat,
      control,
      notifyData,
      task,
      setUser,
      setOrder,
      setChat,
      setControl,
      setNotifyData,
      setTask,
    ]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
