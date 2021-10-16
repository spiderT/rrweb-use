import React, { useRef } from "react";
import { Button } from "antd";
import { record, pack } from "rrweb";
import RecordBtn from "../../components/recordBtn";
import { db } from "../../models/db";
import { LOGKEY } from "../../constants";

const Demo6 = () => {
  let events = useRef([]);
  let stopFn = useRef(null);

  const startRecord = () => {
    stopFn.current = record({
      emit(event) {
        events.current.push(event);
      },
      packFn: pack,
    });
  };

  const endRecord = () => {
    stopFn.current && stopFn.current();
    const time = new Date().toLocaleString();
    const data = {
      project: "demo6",
      time,
      events: events.current,
      isPack: true,
    };
    events.current = [];
    db.rrwebLists.add({ data });
  };

  return (
    <div>
      <RecordBtn startRecord={startRecord} endRecord={endRecord} />
      <div>
        <video controls width="500">
          <source src={require("../../video/video.mp4")} type="video/mp4" />
        </video>
      </div>
      <p>热爱105℃的你</p>
      <audio controls src={require("../../video/audio.m4a")} />

      <p>音视频在录制的时候，如何没有点暂停结束，在回放的时候，在录制时间结束后会继续播放</p>
    </div>
  );
};

export default Demo6;
