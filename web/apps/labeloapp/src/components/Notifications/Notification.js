import "./Notification.css";
import React, { useEffect, useRef, useState } from "react";
import WebSocketLB from "../../services/websocket";
import { Userpic } from "../Userpic/Userpic";
import { notification } from "antd";
import { MdMarkAsUnread } from "react-icons/md";

const Context = React.createContext({
  name: 'Default',
});

export default function Notification({ api }) {
  const popupRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const [notifyApi, contextHolder] = notification.useNotification();

  useEffect(() => {
    const websocket = new WebSocketLB();
    const newSocket = websocket.addSocket("/ws/notification", "notification");

    newSocket.onmessage = (e) => {
      let data = JSON.parse(e.data);

      if (data.type === "notification") {
        setNotifications(prevNotifications => {
          if (!prevNotifications.some(n => n.id === data.id)) {
            return [data, ...prevNotifications];
          }
          return prevNotifications;
        });
        const btn = (
          <button className="notify-btn mark-read-btn" onClick={(ev) => onRead(data.id, ev)}>
            <MdMarkAsUnread/>
          </button>
        );

        const type = data.notficationType || "info";

        notifyApi[type]({
          message: data.title,
          description: data.notification,
          placement: "topRight",
          btn,
          icon: <Userpic user={data.user} />,
          showProgress: true,
          pauseOnHover: true,
        });
      }
    };
    return () => {
      newSocket.close();
    };
  }, []);

  const onClick = (ev) => {
    if (popupRef.current && !popupRef.current.contains(ev.target)) {
      setShow(show ? "" : "show");
    }
  };

  useEffect(() => {
    if (show) {
      // Bind the event listener
      document.addEventListener("mousedown", onClick);
    } else {
      // Unbind the event listener on cleanup
      document.removeEventListener("mousedown", onClick);
    }

    return () => {
      document.removeEventListener("mousedown", onClick);
    };
  }, [show]);

  useEffect(async () => {
    let res = await api.callApi("getNotifications");

    setNotifications(res);
  }, []);

  useEffect(() => {
    setCount(notifications.length);
  }, [notifications]);

  const dateCalc = (dateString) => {
    let date = new Date(dateString);
    let today = new Date();
    let yesterday = today.getDate() - 1;

    // check is today
    if (date.getDate() === today.getDate()) {
      return "Today";
    } else if (date.getDate() === yesterday) {
      return "Yesterday";
    } else {
      let days = today.getDate() - date.getDate();

      return `${days.toString()} days ago`;
    }
  };

  async function onRead(id, ev) {
    ev.preventDefault();
    const response = await api.callApi('setReadNotification', {
      method: 'POST',
      params: {
        pk: id,
      },
    });

    if (response.$meta.status === 200) {
      setNotifications(prevNotifications => {
        return prevNotifications.filter(n => n.id !== id);
      });
    } else {
      notifyApi.error({
        message: "Error",
        description: response.$meta.errors[0],
        duration: 2,
      });
    }
  }

  return <Context.Provider value={api}>
    {contextHolder}
  <div className="notification">
    <button className="notify-btn" id="notifyBtn" onClick={onClick}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path
          d="M20 18.6667L20.4 19.2C20.5657 19.4209 20.5209 19.7343 20.3 19.9C20.2135 19.9649 20.1082 20 20 20H4C3.72386 20 3.5 19.7761 3.5 19.5C3.5 19.3918 3.53509 19.2865 3.6 19.2L4 18.6667V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V18.6667ZM9.5 21H14.5C14.5 22.3807 13.3807 23.5 12 23.5C10.6193 23.5 9.5 22.3807 9.5 21Z">
        </path>
      </svg>
      {notifications?.length > 0 && (<mark>{count}</mark>)}
    </button>
    <ul ref={popupRef} className={`notify-content ${show ? "show" : ""}`} id="notifyContent">
      {notifications.length === 0 ? (
        <li className="notification-list">
          <div className="notification">
            <div className="notification_info">
              <p className="notification_data">No notification available</p>
            </div>
          </div>
        </li>
      ) : (
        notifications.map(nt => (
          <li className="notification-list" key={nt.id}>
            <div className="notification">
              <div className="user">
                <Userpic user={nt.user}/>
              </div>
              <div className="notification_info">
                <p className="notification_data" title={nt.title}>{nt.title}</p>
                <p className="notification_text" title={nt.notification}>{nt.notification}</p>
              </div>
            </div>
            <div className="notification_details">
              <span className="notify_time">{dateCalc(nt.timestamp)}</span>
              <button className="notify-btn mark-read-btn" onClick={(ev) => onRead(nt.id, ev)}>
                <MdMarkAsUnread/>
              </button>
            </div>
          </li>
        ))
      )}
    </ul>
  </div>
  </Context.Provider>
}
