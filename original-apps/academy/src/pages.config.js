/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Admin from './pages/Admin';
import Assessment from './pages/Assessment';
import DrinkItem from './pages/DrinkItem';
import Drinks from './pages/Drinks';
import GameBuildDish from './pages/GameBuildDish';
import GameDishMatch from './pages/GameDishMatch';
import GameMemory from './pages/GameMemory';
import GameMode from './pages/GameMode';
import GameScenario from './pages/GameScenario';
import GameTimed from './pages/GameTimed';
import Games from './pages/Games';
import Glossary from './pages/Glossary';
import Home from './pages/Home';
import Menu from './pages/Menu';
import MenuCategory from './pages/MenuCategory';
import MenuItem from './pages/MenuItem';
import SakeAcademy from './pages/SakeAcademy';
import SpiritsReference from './pages/SpiritsReference';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Assessment": Assessment,
    "DrinkItem": DrinkItem,
    "Drinks": Drinks,
    "GameBuildDish": GameBuildDish,
    "GameDishMatch": GameDishMatch,
    "GameMemory": GameMemory,
    "GameMode": GameMode,
    "GameScenario": GameScenario,
    "GameTimed": GameTimed,
    "Games": Games,
    "Glossary": Glossary,
    "Home": Home,
    "Menu": Menu,
    "MenuCategory": MenuCategory,
    "MenuItem": MenuItem,
    "SakeAcademy": SakeAcademy,
    "SpiritsReference": SpiritsReference,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};