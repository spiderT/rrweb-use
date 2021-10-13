import React, { useState, useRef, useEffect } from "react";
import { Button, Modal, message } from "antd";
import rrwebPlayer from "rrweb-player";
import { unpack } from "rrweb";
import { RightCircleTwoTone } from "@ant-design/icons";
import AceEditor from "react-ace";
import { jsonParse } from "../../utils";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "./index.css";

export default (props) => {
  const [visible, setVisible] = useState(false);
  const videoRef = useRef(null);
  const [data, setData] = useState([]);
  let replayer = null;

  const onChange = (value) => {
    setData(value);
  };

  const handlePlay = () => {
    const events = jsonParse(data);
    if (!events || events.length < 2) {
      message.error("无数据");
      return;
    }
    replayer = new rrwebPlayer({
      target: videoRef.current, // 自定义 DOM 元素
      // 配置项
      props: {
        events,
        width: 600,
        height: 400,
        unpackFn: unpack,
      },
    });
  };

  return (
    <div>
      <Button type="primary" onClick={() => setVisible(true)}>
        回放自定义events
      </Button>
      <Modal
        title="自定义events回放"
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={1200}
        height={800}
        destroyOnClose
      >
        <div className="container-wrap">
          <AceEditor
            mode="json"
            theme="github"
            onChange={onChange}
            name="UNIQUE_ID_OF_DIV"
            className="json-container"
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              useWorker: false,
            }}
          />
          <Button
            className="play-btn"
            type="link"
            shape="circle"
            onClick={handlePlay}
            icon={<RightCircleTwoTone />}
          />
          <div ref={videoRef} className="video-container" />
        </div>
      </Modal>
    </div>
  );
};
