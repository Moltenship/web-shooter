# Web Shooter

Браузерное расширение: по горячей клавише снимает видимую часть текущей вкладки и кладёт PNG в буфер обмена.

- Хоткей по умолчанию — `Alt+Shift+S` (`⌥⇧S` на macOS), меняется в настройках.
- Тост «Скриншот скопирован» прямо на странице (отключается).
- Опционально уменьшает HiDPI/Retina-скриншоты до размера в CSS-пикселях.
- Попап по клику на иконку: кнопка «Скопировать скриншот» с превью.
- Интерфейс на русском и английском (по языку браузера).
- Никаких host-permissions: только `activeTab`, `scripting`, `clipboardWrite`, `storage`.

## Стек

[WXT](https://wxt.dev) 0.21 · [Vite+](https://viteplus.dev) 1.4 (Vite 8 / Rolldown, Oxlint, Oxfmt, Vitest 5) · TypeScript 7 · Manifest V3 (Chrome ≥ 140) · без UI-фреймворков.

## Команды

```sh
vp install            # зависимости
vp run dev            # Chrome с расширением и HMR
vp run build          # сборка в .output/chrome-mv3
vp run zip            # архив для Chrome Web Store
vp check              # формат + линт + типы
vp test               # юнит-тесты
```

## Установка вручную

1. `vp run build`
2. `chrome://extensions` → включить «Режим разработчика» → «Загрузить распакованное» → выбрать `.output/chrome-mv3`.

## Как это устроено

```
хоткей ─► background: tabs.captureVisibleTab (activeTab)
              │
              ├─► scripting.executeScript в странице → navigator.clipboard.write + тост
              │        (страница в фокусе, поэтому Clipboard API работает)
              │
              └─► не вышло (chrome://, http без HTTPS, фокус не в странице)
                       → картинка передаётся в попап расширения, он копирует сам
```

У service worker нет DOM и фокуса, поэтому записать картинку в буфер из фона нельзя. Её записывает страница, а если она не может, то попап.

### Смена хоткея

API Chrome не даёт расширению менять сочетания программно, поэтому кнопка в настройках открывает `chrome://extensions/shortcuts`. Область действия оставьте «В Chrome»: глобальный хоткей не выдаёт расширению `activeTab`, и снимок не получится.

## Структура

```
entrypoints/
  background.ts       обработчик хоткея, захват, доставка в буфер
  popup/              попап на иконке
  options/            страница настроек
utils/
  capture.ts          захват + даунскейл через OffscreenCanvas
  copy-in-page.ts     функция, инжектируемая в страницу (самодостаточная!)
  shortcut.ts         разбор сочетаний для отображения (+ тесты)
  settings.ts         настройки в storage.sync
public/_locales/      en / ru
assets/icon.svg       исходник иконки (PNG генерирует @wxt-dev/auto-icons)
```
