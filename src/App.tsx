import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/home_screen';
import Header from './components/header';
import SettingsScreen from './screens/settings_screen';
import { constants } from './utils/constants';
import CreateWalletScreen from './screens/create_wallet_screen';
import CreateTransactionScreen from './screens/create_transaction_screen';
import TransactionDetailsScreen from './screens/transaction_details_screen';
import EditTransactionScreen from './screens/edit_transaction_screen';
import ExportDataScreen from './screens/export_data_screen';
import WalletsScreen from './screens/wallets_screen';
import WalletDetailsScreen from './screens/wallet_details_screen';
import EditWalletScreen from './screens/edit_wallet_screen';
import { SQLiteProvider } from 'expo-sqlite';
import AlertProvider from './components/ui/Alert';
import { migrateDbIfNeeded } from './lib/db';
import { RootStackParamList } from './lib/navigation';
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from 'react';
import SearchScreen from './screens/search_screen';


SplashScreen.preventAutoHideAsync();

const AppStack = createNativeStackNavigator<RootStackParamList>({
  screenOptions: {
    animation: "slide_from_right",
    headerTitleStyle: {
      fontFamily: constants.fonts.HSR,
    },
    headerTitleAlign: 'center',
    headerShadowVisible: false,
  },
  screens: {
    home: {
      screen: HomeScreen,
      options: {
        header: () => <Header />,
      },
    },
    settings: {
      screen: SettingsScreen,
      options: {
        title: "Settings"
      }
    },
    createTransaction: {
      screen: CreateTransactionScreen,
      options: {
        title: "Create Transaction",
      }
    },
    createWallet: {
      screen: CreateWalletScreen,
      options: {
        title: "Create Wallet",
      }
    },
    transactionDetails: {
      screen: TransactionDetailsScreen,
      options: {
        title: "Transaction Details",
      }
    },
    editTransaction: {
      screen: EditTransactionScreen,
      options: {
        title: "Edit Transaction",
      }
    },
    exportData: {
      screen: ExportDataScreen,
      options: {
        title: "Export / Import",
      }
    },
    wallets: {
      screen: WalletsScreen,
      options: {
        title: "Wallets",
      }
    },
    walletDetails: {
      screen: WalletDetailsScreen,
      options: {
        title: "Wallet Details",
      }
    },
    editWallet: {
      screen: EditWalletScreen,
      options: {
        title: "Edit Wallet",
      }
    },
    search: {
      screen: SearchScreen,
      options: {
        title: "Search",
      }
    }
  }
});
const Navigation = createStaticNavigation(AppStack);


export default function App() {
  const [loaded, error] = useFonts({
    "HindSiliguri-Regular": require("@/assets/fonts/HindSiliguri-Regular.ttf")
  })

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }


  return (
    <SQLiteProvider databaseName='trackora.db' onInit={migrateDbIfNeeded}>
      <AlertProvider>
        <StatusBar style="dark" />
        <Navigation />
      </AlertProvider>
    </SQLiteProvider>
  );
}
