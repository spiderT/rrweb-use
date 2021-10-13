import React, { useRef } from "react";
import { Form, Input, Button, Select } from "antd";
import { record, pack } from "rrweb";
import RecordBtn from "../../components/recordBtn";
import { db } from "../../models/db";
import { LOGKEY } from "../../constants";

const { Option } = Select;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const Demo1 = () => {
  let events = useRef([]);
  const [form] = Form.useForm();
  let stopFn = useRef(null);

  const onGenderChange = (value) => {
    switch (value) {
      case "male":
        form.setFieldsValue({ note: "Hi, man!" });
        return;
      case "female":
        form.setFieldsValue({ note: "Hi, lady!" });
        return;
      case "other":
        form.setFieldsValue({ note: "Hi there!" });
    }
  };

  const onFinish = (values) => {
    console.log(values);
  };

  const onReset = () => {
    form.resetFields();
  };

  const onFill = () => {
    form.setFieldsValue({
      note: "Hello world!",
      gender: "male",
    });
  };

  const startRecord = () => {
    stopFn.current = record({
      emit(event) {
        events.current.push(event);
      },
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
      project: "demo4",
      time,
      events: events.current,
      isPack: true,
    };
    events.current = [];
    db.rrwebLists.add({ data });
  };

  return (
    <div>
      <h1>抽样策略</h1>
      <RecordBtn startRecord={startRecord} endRecord={endRecord} />
      <Form {...layout} form={form} name="control-hooks" onFinish={onFinish}>
        <Form.Item name="note" label="Note" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
          <Select
            placeholder="Select a option and change input text above"
            onChange={onGenderChange}
            allowClear
          >
            <Option value="male">male</Option>
            <Option value="female">female</Option>
            <Option value="other">other</Option>
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.gender !== currentValues.gender
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("gender") === "other" ? (
              <Form.Item
                name="customizeGender"
                label="Customize Gender"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
          <Button htmlType="button" onClick={onReset}>
            Reset
          </Button>
          <Button type="link" htmlType="button" onClick={onFill}>
            Fill form
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Demo1;
