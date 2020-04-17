import React from "react";
import {
  makeStyles,
  ThemeProvider,
  createMuiTheme
} from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import CircularProgress from "@material-ui/core/CircularProgress";
import { SnackbarProvider } from "notistack";

import Navigator from "./components/Navigator";
import { useStore } from "./stores/RootStore";
import { observer } from "mobx-react";

const useStyles = makeStyles(theme => ({
  root: {
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }
}));

const darkTheme = createMuiTheme({
  palette: {
    type: "dark"
  }
});

export default observer(() => {
  const classes = useStyles();
  const rootStore = useStore();
  const { uiState } = rootStore;

  React.useEffect(() => {
    rootStore.init();
  }, [rootStore]);

  return (
    <div className={classes.root} onKeyPress={e => uiState.handleKeyPress(e)}>
      <SnackbarProvider maxSnack={3}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          {rootStore.isInitialized ? <Navigator /> : <CircularProgress />}
        </ThemeProvider>
      </SnackbarProvider>
    </div>
  );
});