import React, { useState, useRef, useEffect } from "react";
import { record, pack } from "rrweb";
import { db } from "../../models/db";
import { LOGKEY } from "../../constants";
import { Link } from "react-router-dom";

const Demo7 = () => {
  let events = useRef([]);
  let stopFn = useRef(null);

  const startRecord = () => {
    stopFn.current = record({
      emit(event) {
        events.current.push(event);
      },
      packFn: pack,
    });
    console.log("demo7--start");
  };

  const save = () => {
    const time = new Date().toLocaleString();
    const data = {
      project: "demo7",
      time,
      events: events.current,
      isPack: true,
    };
    console.log("demo7", data);
    if (events.current && events.current.length) {
      db.rrwebLists.add({ data });
    }
    events.current = [];
  };

  useEffect(() => {
    startRecord();
    // 停止录制
    return () => {
      stopFn.current && stopFn.current();
      save();
    };
  }, []);

  return (
    <>
      <p>
        <Link to="/demo1"> 跳转内部路由 Link</Link>
      </p>
      <p>
        <a href="https://www.baidu.com">跳转外部链接</a>
      </p>
    </>
  );
};

export default Demo7;
