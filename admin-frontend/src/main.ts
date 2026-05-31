import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { ConfigProvider } from 'vant'
import 'vant/lib/index.css'
import './style.css'

const app = createApp(App)

app.use(router)
app.use(ConfigProvider)


app.mount('#app')
