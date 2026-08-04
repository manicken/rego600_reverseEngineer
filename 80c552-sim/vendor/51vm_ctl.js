
    //--------interrupt service implement------


_51cpu.prototype.next = function (count = 1) {
    let len = 1
    for(let i = 0; i < count; ++i){
        len = this.execute_one()
        if(len == 0)
            return -1; // error
        if(this.addr_breakpoint.includes(this.PC.get()))
            return 0; // breakpoint reached
    }   
    return 1;
}


_51cpu.prototype.coutinue = function () {
    while(true){
        this.execute_one()
        if(this.addr_breakpoint.includes(this.PC.get()))
            break;
    }
}

