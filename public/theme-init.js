(() => {
   const storageKey = "h2-leitungen-ui-theme";
   let theme = "dark";

   try {
      const storedTheme = window.localStorage.getItem(storageKey);
      if (storedTheme === "light" || storedTheme === "dark") {
         theme = storedTheme;
      }
   } catch {
      theme = "dark";
   }

   document.documentElement.classList.remove("light", "dark");
   document.documentElement.classList.add(theme);
   document.documentElement.style.colorScheme = theme;
})();
