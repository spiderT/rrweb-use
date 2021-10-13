import React, { useState, useRef, useEffect } from "react";
import { Form, Input, Button, Select, Radio } from "antd";
import { record, pack } from "rrweb";
import { db } from "../../models/db";
import { LOGKEY } from "../../constants";
import { changeNodeTreeArrTimestampToNow } from "../../utils";
import ArrayCreate from "es-abstract/2015/ArrayCreate";

const { Option } = Select;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const Demo3 = () => {
  // 使用二维数组来存放多个 event 数组
  const eventsMatrix = [[]];
  const [form] = Form.useForm();
  let stopFn = useRef(null);

  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 14 },
  };

  const buttonItemLayout = {
    wrapperCol: { span: 14, offset: 4 },
  };

  const startRecord = () => {
    stopFn.current = record({
      emit(event, isCheckout) {
        // isCheckout 是一个标识，告诉你重新制作了快照
        if (isCheckout) {
          eventsMatrix.push([]);
        }
        const lastEvents = eventsMatrix[eventsMatrix.length - 1];
        lastEvents.push(event);
      },
      packFn: pack,
      checkoutEveryNth: 50, // 每 50 个 event 重新制作快照
    });
  };

  useEffect(() => {
    startRecord();
    // 停止录制
    return () => stopFn.current && stopFn.current();
  }, []);

  useEffect(() => {
    // 向后端传送最新的两个 event 数组
    window.onerror = function () {
      const len = eventsMatrix.length;
      const events = eventsMatrix[len - 2].concat(eventsMatrix[len - 1]);
      const time = new Date().toLocaleString();
      const data = {
        project: "demo3",
        time,
        events,
        isPack: true,
      };
      console.log("demo3", data);
      if (events && events) {
        db.rrwebLists.add({ data });
      }
    };
  }, []);

  const handleInput = (e) => {
    const reg = /[\u2E80-\u9FFF]/; // Unicode编码中的汉字范围
    const value = e.target.value;
    if (reg.test(value)) {
      throw new Error("不能输入中文");
    }
  };

  const renderInput = () =>
    Array.from("ABCDEFGHIJKLMN").map((item) => (
      <Form.Item label={item} key={item}>
        <Input placeholder="只能输入非中文" onChange={handleInput} />
      </Form.Item>
    ));

  return (
    <>
      <Form {...formItemLayout} form={form}>
        {renderInput()}
        <Form.Item {...buttonItemLayout}>
          <Button type="primary">Submit</Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default Demo3;
