import React, { useRef } from "react";
import { Button } from "antd";
import { record, pack, getRecordConsolePlugin } from "rrweb";
import RecordBtn from "../../components/recordBtn";
import { db } from "../../models/db";
import { LOGKEY } from "../../constants";
import "./index.css";

const Demo5 = () => {
  let events = useRef([]);
  let stopFn = useRef(null);

  const startRecord = () => {
    stopFn.current = record({
      emit(event) {
        // 如果要使用console来输出信息，请使用如下的写法
        const defaultLog = console.log["__rrweb_original__"]
          ? console.log["__rrweb_original__"]
          : console.log;
        defaultLog(event);
        events.current.push(event);
      },
      plugins: [getRecordConsolePlugin()],
      packFn: pack,
      sampling: {
        // 不录制鼠标移动事件
        mousemove: false,
        // 定义不录制的鼠标交互事件类型，可以细粒度的开启或关闭对应交互录制
        mouseInteraction: {
          MouseUp: false,
          MouseDown: false,
          Click: false,
          ContextMenu: false,
          DblClick: false,
          Focus: false,
          Blur: false,
          TouchStart: false,
          TouchEnd: false,
        },
        // 设置滚动事件的触发频率
        scroll: 150, // 每 150ms 最多触发一次
        // 设置输入事件的录制时机
        input: "last", // 连续输入时，只录制最终值
      },
    });
  };

  const endRecord = () => {
    stopFn.current && stopFn.current();
    const time = new Date().toLocaleString();
    const data = {
      project: "demo5",
      time,
      events: events.current,
      isPack: true,
    };
    events.current = [];
    db.rrwebLists.add({ data });
  };

  return (
    <div>
      <h1>录制console</h1>
      <RecordBtn startRecord={startRecord} endRecord={endRecord} />

      <Button
        className="btn"
        onClick={() => console.log("info!!!!")}
      >
        console.info
      </Button>
      <Button
        type="primary"
        className="btn"
        onClick={() => console.log("log!!!!")}
      >
        console.log
      </Button>
      
      <Button
        className="btn"
        danger
        onClick={() => console.warn("warn!!!!")}
      >
        console.warn
      </Button>
      <Button
        type="primary"
        className="btn"
        danger
        onClick={() => console.error("error!!!!")}
      >
        console.error
      </Button>
    </div>
  );
};

export default Demo5;
