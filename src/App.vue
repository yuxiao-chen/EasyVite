<template>
    <div @click="add"> vue app {{ num }} </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
    name: 'App',
    setup() {
        const num = ref(0)
        const add = () => num.value++
        return {
            num,
            add
        }
    }
})
</script>

<style scoped lang="scss">

</style>