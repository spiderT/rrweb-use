import React, { useState, useRef, useEffect } from "react";
import { Form, Input, Button, Select, Radio } from "antd";
import { record, pack } from "rrweb";
import { db } from "../../models/db";
import { LOGKEY } from "../../constants";
import { changeNodeTreeArrTimestampToNow } from "../../utils";

const { Option } = Select;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const Demo2 = () => {
  const nodeTreeArr = []; // 记录初始node，用于后续上报
  let firstReport = useRef(true);
  let events = useRef([]);
  let timer = null;
  const [form] = Form.useForm();
  const [formLayout, setFormLayout] = useState("horizontal");
  let stopFn = useRef(null);

  const onFormLayoutChange = ({ layout }) => {
    setFormLayout(layout);
  };

  const formItemLayout =
    formLayout === "horizontal"
      ? {
          labelCol: { span: 4 },
          wrapperCol: { span: 14 },
        }
      : null;

  const buttonItemLayout =
    formLayout === "horizontal"
      ? {
          wrapperCol: { span: 14, offset: 4 },
        }
      : null;

  const startRecord = () => {
    stopFn.current = record({
      emit(event) {
        if (firstReport.current && (event.type === 2 || event.type === 4)) {
          nodeTreeArr.push(event);
        }
        events.current.push(event);
      },
      packFn: pack,
    });
    console.log("demo2--start");
  };

  const save = () => {
    const time = new Date().toLocaleString();
    changeNodeTreeArrTimestampToNow(nodeTreeArr);
    const data = {
      project: "demo2",
      time,
      events: firstReport.current
        ? events.current
        : nodeTreeArr.concat(events.current),
      isPack: true,
    };
    console.log("demo2", data);
    if (events.current && events.current.length) {
      db.rrwebLists.add({ data });
    }
    // todo 后续上传的events没有dom结构，用于播放渲染，需要把之前的dom结构存储每次上报
    // todo 多次连续上传数据，要做连续播放处理
    // data里的node进行页面渲染
    events.current = [];
    firstReport.current = false;
  };

  useEffect(() => {
    startRecord();
    // 停止录制
    return () => stopFn.current && stopFn.current();
  }, []);

  useEffect(() => {
    // 每 10 秒调用一次 save 方法，避免请求过多
    timer = setInterval(save, 10 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Form
        {...formItemLayout}
        layout={formLayout}
        form={form}
        initialValues={{ layout: formLayout }}
        onValuesChange={onFormLayoutChange}
      >
        <Form.Item label="Form Layout" name="layout">
          <Radio.Group value={formLayout}>
            <Radio.Button value="horizontal">Horizontal</Radio.Button>
            <Radio.Button value="vertical">Vertical</Radio.Button>
            <Radio.Button value="inline">Inline</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Field A">
          <Input placeholder="input placeholder" />
        </Form.Item>
        <Form.Item label="Field B">
          <Input placeholder="input placeholder" />
        </Form.Item>
        <Form.Item {...buttonItemLayout}>
          <Button type="primary">Submit</Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default Demo2;
