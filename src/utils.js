export const transformList = (list) => {
  if (!list || !list.length) {
    return [];
  }

  return list.map((item) => {
    item.project = item.data.project;
    item.time = item.data.time;
    item.events = item.data.events;
    item.isPack = item.data.isPack;
  });
};

export const changeNodeTreeArrTimestampToNow = (list) => {
  if (!list || !list.length) {
    return [];
  }

  return list.map((item) => {
    console.log("item", item);
    item.timestamp = new Date().getTime();
  });
};

export const jsonParse = (dataString) => {
  let data = null;
  if (typeof dataString !== "string") {
    return dataString;
  }
  try {
    data = JSON.parse(dataString);
  } catch (e) {}
  return data;
};
