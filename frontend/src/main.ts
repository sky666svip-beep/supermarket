import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import 'material-symbols/outlined.css'
import './style.css'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css'
import Vant, { Lazyload } from 'vant'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)
app.use(Lazyload)

app.mount('#app')
