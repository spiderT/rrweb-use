import React, { useEffect, useState, Suspense } from "react";
import {
  HashRouter as Router,
  Route,
  Switch,
  useLocation,
} from "react-router-dom";
import { Breadcrumb } from "antd";
import css from "styled-jsx/css";
import { MENU, ROUTE } from "../config/router";
import Sider from "../components/sider";
import CustomReplayBtn from "../components/customReplayBtn";
import List from "./list";

const Main = () => {
  const location = useLocation();
  const [breads, setBreads] = useState(null);

  useEffect(() => {
    const { route } = ROUTE.find((val) => val.path.includes(location.pathname));
    setBreads(route);
  }, [location]);

  return (
    <div className="container">
      <div className="sider-container">
        <div className="logo">WebRecord</div>
        <div className="menu-container">
          <Sider route={MENU} current={breads}></Sider>
        </div>
      </div>
      <div className="main-container">
        {breads && (
          <div className="header">
            <Breadcrumb>
              {breads.map((val, index) => (
                <Breadcrumb.Item key={index}>{val}</Breadcrumb.Item>
              ))}
            </Breadcrumb>
            <div>
              <CustomReplayBtn />
            </div>
          </div>
        )}
        <div className="main-content">
          <Suspense fallback={<p>加载中...</p>}>
            <Switch>
              <Route exact path="/" component={List} />
              {ROUTE.map((val) => (
                <Route
                  exact
                  path={val.path}
                  component={val.component}
                  key={val.key}
                />
              ))}
            </Switch>
          </Suspense>
        </div>
      </div>
      <style jsx>{styles}</style>
    </div>
  );
};

export default () => {
  return (
    <Router>
      <Main></Main>
    </Router>
  );
};

const styles = css`
  .container {
    display: flex;
  }
  .sider-container {
    background: #001529;
    min-height: 100vh;
    width: 12vw;
  }
  .logo {
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 28px;
    font-weight: bold;
    color: #ffffff;
  }
  .main-container {
    width: 88vw;
    margin: 0px 10px;
  }
  .header {
    background: #fafafa;
    min-height: 60px;
    padding: 10px;
    margin: 10px 0;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .main-content {
    width: 100%;
  }
`;
