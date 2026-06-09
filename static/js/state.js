let currentUser = null;

export const getUser = () => currentUser;
export const setUser = (user) => { currentUser = user; };
