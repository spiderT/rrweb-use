import React, { useState, useRef } from "react";
import { Table, Button, Modal } from "antd";
import { useLiveQuery } from "dexie-react-hooks";
import rrwebPlayer from "rrweb-player";
import { unpack, getReplayConsolePlugin } from "rrweb";
import ReactJson from "react-json-view";
import { db } from "../../models/db";
import { transformList } from "../../utils";
import "rrweb-player/dist/style.css";
import { LOGKEY } from "../../constants";
import "./index.css";

export default () => {
  const videoRef = useRef(null);
  const columns = [
    {
      title: "Id",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "应用",
      dataIndex: "project",
      key: "project",
    },
    {
      title: "日志时间",
      dataIndex: "time",
      key: "time",
    },
    {
      title: "事件个数",
      dataIndex: "events",
      key: "eventsLen",
      render: (row) => row.length,
    },
    {
      title: "字符长度",
      dataIndex: "events",
      key: "eventsStrLen",
      render: (row) => JSON.stringify(row).length,
    },
    {
      title: "操作",
      // dataIndex: "events",
      // key: "events",
      render: (row) => (
        <div>
          {row.isPack ? (
            <Button type="text"> 已压缩 </Button>
          ) : (
            <Button type="link" onClick={() => handleShowEvents(row.events)}>
              查看数据
            </Button>
          )}
          <Button type="link" onClick={() => handlePlay(row.events)}>
            回放
          </Button>
        </div>
      ),
    },
  ];

  const [currentData, setCurrentData] = useState({});
  const [visible, setVisible] = useState(false);
  const [jsonVisible, setJsonVisible] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  let timer = null;

  const list = useLiveQuery(() => db.rrwebLists.toArray());

  transformList(list);

  const handleShowEvents = (row) => {
    setJsonVisible(true);
    setJsonData(row.events);
  };

  const handlePlay = (row) => {
    setVisible(true);
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      const replayer = new rrwebPlayer({
        target: videoRef.current, // 自定义 DOM 元素
        // 配置项
        props: {
          events: row,
          width: 900,
          height: 400,
          unpackFn: unpack,
          plugins: [
            getReplayConsolePlugin({
              level: ["info", "log", "warn", "error"],
            }),
          ],
        },
      });
      // 允许用户在回放的 UI 中进行交互
      // ?? replayer.enableInteract is not a function
      // replayer.enableInteract();
    }, 1000);
  };

  return (
    <div className="table-container">
      <Table
        bordered
        columns={columns}
        dataSource={list}
        rowKey={(record) => record.id}
      />
      <Modal
        title="日志播放"
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <div ref={videoRef} className="video-container" />
      </Modal>
      <Modal
        title="events列表"
        visible={jsonVisible}
        onCancel={() => setJsonVisible(false)}
        footer={null}
        width={1000}
        height={700}
      >
        <ReactJson src={jsonData} />
      </Modal>
    </div>
  );
};
