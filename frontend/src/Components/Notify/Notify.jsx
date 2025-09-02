import styles from "./Notify.module.css";
import { useContext, useEffect } from "react";
import { UserContext } from "../../Context/UserContext.jsx";

const Notify = () => {
  const { notifyData, setNotifyData } = useContext(UserContext);
  const { title, message, type_notification, duration, active } = notifyData;

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        setNotifyData({ ...notifyData, active: false });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration, setNotifyData, notifyData]);

  if (!active) return null;

  const notifyStyle = () => {
    switch (type_notification) {
      case "info":
        return styles.info;
      case "success":
        return styles.success;
      case "warning":
        return styles.warning;
      case "error":
        return styles.error;
      default:
        return styles.default;
    }
  };

  return (
    <div className={styles.container}>
      <div
        style={{ animationDuration: `${duration}ms` }}
        className={`${notifyStyle()}` + ` ${styles.notify}`}
      >
        {title && <div className={styles.title}>{title}</div>}
        {message && <div className={styles.message}>{message}</div>}
      </div>
    </div>
  );
};
export default Notify;
