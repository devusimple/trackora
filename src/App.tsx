import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import Header from './components/header';
import AlertProvider from './components/ui/Alert';
import { migrateDbIfNeeded } from './lib/db';
import { hasSeenOnboarding, useAuth } from './lib/google_auth';
import { RootStackParamList } from './lib/navigation';
import CreateTransactionScreen from './screens/create_transaction_screen';
import CreateWalletScreen from './screens/create_wallet_screen';
import EditTransactionScreen from './screens/edit_transaction_screen';
import EditWalletScreen from './screens/edit_wallet_screen';
import ExportDataScreen from './screens/export_data_screen';
import HomeScreen from './screens/home_screen';
import OnboardingScreen from './screens/onboarding_screen';
import SearchScreen from './screens/search_screen';
import SettingsScreen from './screens/settings_screen';
import TransactionDetailsScreen from './screens/transaction_details_screen';
import WalletDetailsScreen from './screens/wallet_details_screen';
import WalletsScreen from './screens/wallets_screen';
import { constants } from './utils/constants';


SplashScreen.preventAutoHideAsync();

function RootNavigator({ initialRoute }: { initialRoute: "home" | "onboarding" }) {
  const StackNavigation = useMemo(
    () =>
      createStaticNavigation(
        createNativeStackNavigator<RootStackParamList>({
          initialRouteName: initialRoute,
          screenOptions: {
            animation: "slide_from_right",
            headerTitleStyle: {
              fontFamily: constants.fonts.HSR,
            },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
          },
          screens: {
            onboarding: {
              screen: OnboardingScreen,
              options: {
                headerShown: false,
                gestureEnabled: false,
              },
            },
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
        })
      ),
    [initialRoute]
  );

  return <StackNavigation />;
}

export default function App() {
  const [loaded, error] = useFonts({
    "HindSiliguri-Regular": require("@/assets/fonts/HindSiliguri-Regular.ttf")
  })
  const [initialRoute, setInitialRoute] = useState<"home" | "onboarding" | null>(null);

  useEffect(() => {
    useAuth.getState().init();
  }, []);

  useEffect(() => {
    hasSeenOnboarding().then((seen) => setInitialRoute(seen ? "home" : "onboarding"));
  }, []);

  useEffect(() => {
    if ((loaded || error) && initialRoute) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, initialRoute]);

  if ((!loaded && !error) || !initialRoute) {
    return null;
  }


  return (
    <SQLiteProvider databaseName='trackora.db' onInit={migrateDbIfNeeded}>
      <AlertProvider>
        <StatusBar style="dark" />
        <RootNavigator initialRoute={initialRoute} />
      </AlertProvider>
    </SQLiteProvider>
  );
}
