import React from 'react'
import { Menu } from 'antd'
import { Link } from 'react-router-dom'
const { SubMenu } = Menu

export default (props) => {
  const creatSubMenu = ({ title, key, path, children = null }) => {
    if (children) {
      return (
        <SubMenu key={key} title={title}>
          {children.map((item) => creatSubMenu(item))}
        </SubMenu>
      )
    } else {
      return (
        <Menu.Item key={key}>
          <Link to={path}>{title}</Link>
        </Menu.Item>
      )
    }
  }

  return (
    <Menu mode="inline" theme="dark" selectedKeys={props.current}>
      {props.route.map((item) => creatSubMenu(item))}
    </Menu>
  )
}
